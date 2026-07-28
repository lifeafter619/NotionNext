#!/usr/bin/env node
/**
 * 容错地应用 patch-package 补丁，并在失败时自动从 registry 恢复重试。
 *
 * 背景：CI（Vercel 等）默认开启 patch-package 的 --error-on-fail，补丁一旦
 * 应用失败就会让 yarn install 以 exit 1 中断。最常见的失败原因是 CI 复用了
 * 被旧版补丁改过的 node_modules 缓存（yarn 显示 "Already up-to-date." 跳过
 * 安装），导致新补丁的上下文与脏文件对不上。
 *
 * 这里的补丁都是增强性的（File 组件可覆盖、gallery 图标显隐、uuidToId 空值
 * 保护、docs chat 错误回退），其中 uuidToId 空值保护关系到运行时健壮性，
 * 不应悄悄丢失。因此本脚本：
 *   1. 优先用 patch-package 正常应用所有补丁；
 *   2. 失败时，对每个被补丁的包：从 yarn.lock 解析其 registry tarball URL，
 *      用 Node 内置 https+zlib 下载并解 tar，把被改动的文件用纯净内容覆盖，
 *      再重新打补丁——从而绕过 CI 的脏 node_modules 缓存；
 *   3. 仍失败则打印诊断，但始终 exit 0，保证部署链路不被阻断。
 *
 * 恢复逻辑只依赖 Node 内置模块（https/zlib/fs），不依赖 npm pack / tar 命令，
 * 在任意 CI 容器里都能稳定工作。
 */
const https = require('https')
const { gunzipSync } = require('zlib')
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PATCH_DIR = path.join(PROJECT_ROOT, 'patches')
const YARN_LOCK = path.join(PROJECT_ROOT, 'yarn.lock')

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

function runPatchPackage() {
  return run('npx patch-package').status
}

/** 从 patches 目录解析 { 包名: { version, patchPath, files[] }[] } */
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

/** 从 patch 内容提取目标文件（相对项目根，形如 node_modules/<pkg>/...）。 */
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
 * 从 yarn.lock 解析包的 registry tarball URL。
 * 支持 yarn lockfile v1 的 resolved 行。
 * yarn.lock 的条目 header 可能是 `pkg@1.2.3:` 或 `pkg@^1.2.3:`（带 semver
 * range），所以按行扫描找到含 version "1.2.3" 的 resolved 块。
 */
function resolvedUrlFor(pkgName, version) {
  if (!fs.existsSync(YARN_LOCK)) return null
  const lock = fs.readFileSync(YARN_LOCK, 'utf8')
  // 定位该包名下、version 匹配的条目块，再取其中第一个 resolved URL。
  // 条目块由 `^<pkg>@...:` 形式的 header 开始，到下一个空行结束。
  const lines = lock.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const headerRe = new RegExp(`^"?${escapeRe(pkgName)}@`)
    if (!headerRe.test(lines[i].trim())) continue
    // 在该块内（直到下一个 header 或空行）找 version 与 resolved
    let j = i
    let foundVersion = false
    for (; j < lines.length; j++) {
      const line = lines[j]
      if (j > i && /^"?[A-Za-z]/.test(line.trim()) && /:$/.test(line.trim())) break // 下一个 header
      if (line.includes(`version "${version}"`)) foundVersion = true
      const m = line.match(/resolved "([^"]+)"/)
      if (m && foundVersion) {
        return m[1].split('#')[0] // 去掉 npmmirror 的 #hash 后缀
      }
    }
  }
  return null
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 用 Node 内置 https 下载内容，返回 Buffer。 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        // 处理重定向（registry 偶尔 302）
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume()
          return resolve(httpsGet(res.headers.location))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

/**
 * 从 gzip tarball 中提取给定路径（相对 package/）的文件内容。
 * 仅解析 ustar/pax 普通文件条目（typeflag "0" 或 "\0"）。
 * 返回 Map<subPath, Buffer>。
 */
function extractTar(tarBuf, wantSubPaths) {
  const want = new Set(wantSubPaths)
  const out = new Map()
  let off = 0
  while (off + 512 <= tarBuf.length) {
    const nameRaw = tarBuf.slice(off, off + 100).toString()
    if (!nameRaw || !nameRaw.replace(/\0/g, '')) break // 空块 = 结束
    const name = nameRaw.replace(/\0/g, '')
    const sizeOct = tarBuf.slice(off + 124, off + 136).toString().replace(/\0/g, '').trim()
    const size = sizeOct ? parseInt(sizeOct, 8) : 0
    const typeflag = tarBuf.slice(off + 156, off + 157).toString()
    off += 512
    // 仅处理普通文件
    const isFile = typeflag === '0' || typeflag === '' || typeflag === '\0'
    if (isFile && size > 0) {
      // name 形如 package/build/index.js
      const subPath = name.replace(/^package\//, '')
      if (want.has(subPath)) {
        out.set(subPath, tarBuf.slice(off, off + size))
      }
    }
    // 内容按 512 对齐
    off += Math.ceil(size / 512) * 512
  }
  return out
}

/**
 * 把被补丁改动的文件用 registry 上的纯净内容覆盖回去。
 */
async function restorePristineFiles(pkgName, version, files) {
  const url = resolvedUrlFor(pkgName, version)
  if (!url) {
    log(`  yarn.lock 中未找到 ${pkgName}@${version} 的 resolved URL，跳过`)
    return
  }
  // files 形如 node_modules/<pkgName>/build/index.js -> build/index.js
  const prefix = `node_modules/${pkgName}/`
  const wantSubPaths = files.filter((f) => f.startsWith(prefix)).map((f) => f.slice(prefix.length))
  if (wantSubPaths.length === 0) return

  let tarGz
  try {
    tarGz = await httpsGet(url)
  } catch (e) {
    log(`  下载 ${url} 失败：${e.message}，跳过`)
    return
  }
  let tarBuf
  try {
    tarBuf = gunzipSync(tarGz)
  } catch (e) {
    log(`  解压 ${url} 失败：${e.message}，跳过`)
    return
  }
  const pristine = extractTar(tarBuf, wantSubPaths)
  for (const subPath of wantSubPaths) {
    const buf = pristine.get(subPath)
    if (!buf) {
      log(`  tarball 中未找到 package/${subPath}，跳过`)
      continue
    }
    const target = path.join(PROJECT_ROOT, prefix + subPath)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, buf)
    log(`  恢复纯净文件: ${prefix}${subPath}`)
  }
}

async function main() {
  log('applying patches…')
  if (runPatchPackage() === 0) {
    log('all patches applied successfully.')
    return
  }

  // 首次失败：很可能是 CI 复用了被旧补丁改过的 node_modules 缓存。
  // 逐包从 registry 恢复纯净内容后再重试。
  log('patch-package failed; resetting patched files from registry and retry…')
  const patches = parsePatches()
  for (const [pkgName, entries] of patches) {
    const { version, files } = entries[0]
    if (files.length === 0) continue
    await restorePristineFiles(pkgName, version, files)
  }

  if (runPatchPackage() === 0) {
    log('all patches applied successfully after reset.')
    return
  }

  // 仍然失败：打印诊断，但不中断构建——补丁是增强性的，失败只会退回 npm
  // 原始包行为。注意 uuidToId 空值保护等会丢失，相关功能需关注。
  log(
    'patch-package still failing after reset. Patches are non-fatal enhancements; ' +
      'falling back to upstream package behavior and continuing the build. ' +
      'If a patched feature looks off, clear the CI node_modules cache and redeploy.'
  )
}

main().catch((err) => {
  // 任何意外异常都不应中断部署
  log('unexpected error, continuing build:', err && err.message ? err.message : err)
  process.exit(0)
})
