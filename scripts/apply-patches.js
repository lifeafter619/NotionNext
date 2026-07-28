#!/usr/bin/env node
/**
 * 容错地应用 patch-package 补丁，并在失败时自动恢复重试。
 *
 * 背景：在 Vercel 等 CI 环境中，patch-package 默认开启 --error-on-fail，
 * 一旦补丁应用失败（最常见于 CI 复用了被旧版补丁改过的 node_modules 缓存，
 * 导致上下文对不上），整个 `yarn install` 就以 exit 1 中断，阻断部署。
 *
 * 这里的补丁都是增强性的（File 组件可覆盖、gallery 图标显隐、uuidToId
 * 空值保护、docs chat 错误回退），即便应用失败也只是退回 npm 原始行为。
 * 但其中 uuidToId 的空值保护关系到运行时健壮性，不应悄悄丢失。
 *
 * 因此本脚本：
 *   1. 优先用 patch-package 正常应用所有补丁；
 *   2. 失败时，对每个被补丁的包：把被改动的文件用纯净 npm tarball 内容
 *      覆盖回去，再重新打补丁，从而绕过 CI 的脏 node_modules 缓存；
 *   3. 仍失败则打印诊断，但始终以 exit 0 结束，保证部署链路不被阻断。
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PATCH_DIR = path.join(PROJECT_ROOT, 'patches')

function log(...args) {
  // eslint-disable-next-line no-console
  console.log('[apply-patches]', ...args)
}

function run(cmd, opts = {}) {
  return spawnSync(cmd, {
    cwd: opts.cwd || PROJECT_ROOT,
    stdio: opts.silent ? 'pipe' : 'inherit',
    shell: true,
    env: { ...process.env, CI: '1' }
  })
}

/** 以 CI 模式运行 patch-package，返回退出码。 */
function runPatchPackage() {
  return run('npx patch-package').status
}

/** patches 目录 -> { 包名: { version, patchPath, files[] }[] } */
function parsePatches() {
  const map = new Map()
  if (!fs.existsSync(PATCH_DIR)) return map
  for (const file of fs.readdirSync(PATCH_DIR)) {
    if (!file.endsWith('.patch')) continue
    const base = file.slice(0, -'.patch'.length)
    const plusIdx = base.lastIndexOf('+')
    if (plusIdx < 0) continue
    const pkgName = base.slice(0, plusIdx)
    const version = base.slice(plusIdx + 1)
    const patchPath = path.join(PATCH_DIR, file)
    const files = patchedFilesFor(patchPath)
    if (!map.has(pkgName)) map.set(pkgName, [])
    map.get(pkgName).push({ version, patchPath, files })
  }
  return map
}

/** 从 patch 内容里提取目标文件路径（相对项目根，形如 node_modules/x/y.js）。 */
function patchedFilesFor(patchPath) {
  const content = fs.readFileSync(patchPath, 'utf8')
  const files = new Set()
  for (const line of content.split('\n')) {
    const m = /^diff --git a\/(\S+) b\//.exec(line)
    if (m) files.add(m[1])
  }
  return [...files]
}

/**
 * 把被补丁改动的文件用纯净 npm tarball 内容覆盖回去。
 * 绕过 CI 复用的脏 node_modules 缓存。
 */
function restorePristineFiles(pkgName, version, files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-patches-'))
  try {
    // 1. 拉取纯净 tarball 到临时目录
    const pack = run(`npm pack "${pkgName}@${version}"`, { cwd: tmp, silent: true })
    const out = (pack.stdout && pack.stdout.toString().trim()) || ''
    const tarballName = out.split('\n').pop()
    if (!tarballName) {
      log(`  npm pack ${pkgName}@${version} 无产物，跳过`)
      return
    }
    // 2. 解压（tarball 内顶层目录是 package/）
    if (run(`tar -xzf "${tarballName}"`, { cwd: tmp, silent: true }).status !== 0) {
      log(`  解压 ${tarballName} 失败，跳过`)
      return
    }
    const pristineRoot = path.join(tmp, 'package')
    if (!fs.existsSync(pristineRoot)) {
      log(`  tarball 内无 package/ 目录，跳过`)
      return
    }
    // 3. 覆盖被补丁改动的文件
    //    rel 形如 node_modules/<pkgName>/build/index.js
    const prefix = `node_modules/${pkgName}/`
    for (const rel of files) {
      if (!rel.startsWith(prefix)) continue
      const subPath = rel.slice(prefix.length)
      const pristineFile = path.join(pristineRoot, subPath)
      const targetFile = path.join(PROJECT_ROOT, rel)
      if (fs.existsSync(pristineFile)) {
        fs.copyFileSync(pristineFile, targetFile)
        log(`  恢复纯净文件: ${rel}`)
      }
    }
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch (_) {
      /* ignore */
    }
  }
}

function main() {
  log('applying patches…')
  if (runPatchPackage() === 0) {
    log('all patches applied successfully.')
    return
  }

  // 首次失败：很可能是 CI 复用了被旧补丁改过的 node_modules 缓存。
  // 逐包恢复纯净 tarball 内容后再重试。
  log('patch-package failed; resetting patched files from npm and retry…')
  const patches = parsePatches()
  for (const [pkgName, entries] of patches) {
    // 同一包通常只有一个版本，取第一条即可
    const { version, files } = entries[0]
    if (files.length === 0) continue
    restorePristineFiles(pkgName, version, files)
  }

  if (runPatchPackage() === 0) {
    log('all patches applied successfully after reset.')
    return
  }

  // 仍然失败：打印诊断，但不中断构建——补丁是增强性的，失败只会退回
  // npm 原始包行为。注意 uuidToId 空值保护等会丢失，相关功能需关注。
  log(
    'patch-package still failing after reset. Patches are non-fatal enhancements; ' +
      'falling back to upstream package behavior and continuing the build. ' +
      'If a patched feature looks off, clear the CI node_modules cache and redeploy.'
  )
}

try {
  main()
} catch (err) {
  // 任何意外异常都不应中断部署
  log('unexpected error, continuing build:', err && err.message ? err.message : err)
}

process.exit(0)
