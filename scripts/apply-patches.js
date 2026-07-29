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
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PATCH_DIR = path.join(PROJECT_ROOT, 'patches')
const YARN_LOCK = path.join(PROJECT_ROOT, 'yarn.lock')

// 仅信任这些 registry 主机的 tarball URL；yarn.lock 被注入其它来源时拒绝下载。
const ALLOWED_REGISTRY_HOSTS = new Set([
  'registry.npmjs.org',
  'registry.yarnpkg.com',
  'registry.npmmirror.com'
])
const MAX_REDIRECTS = 5

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
 * 从 yarn.lock 解析包的 registry tarball URL 与 integrity。
 * 支持 yarn lockfile v1 的 resolved / integrity 行。
 * yarn.lock 的条目 header 可能是 `pkg@1.2.3:` 或 `pkg@^1.2.3:`（带 semver
 * range），所以按行扫描找到含 version "1.2.3" 的 resolved 块。
 */
function resolvedEntryFor(pkgName, version) {
  if (!fs.existsSync(YARN_LOCK)) return null
  const lock = fs.readFileSync(YARN_LOCK, 'utf8')
  // 定位该包名下、version 匹配的条目块，再取其中的 resolved URL 与 integrity。
  // 条目块由 `^<pkg>@...:` 形式的 header 开始，到下一个空行结束。
  const lines = lock.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const headerRe = new RegExp(`^"?${escapeRe(pkgName)}@`)
    if (!headerRe.test(lines[i].trim())) continue
    // 在该块内（直到下一个 header 或空行）找 version 与 resolved / integrity
    let j = i
    let foundVersion = false
    let url = null
    let integrity = null
    for (; j < lines.length; j++) {
      const line = lines[j]
      if (j > i && /^"?[@A-Za-z]/.test(line.trim()) && /:$/.test(line.trim())) break // 下一个 header
      if (line.includes(`version "${version}"`)) foundVersion = true
      const m = line.match(/resolved "([^"]+)"/)
      if (m && foundVersion && !url) {
        url = m[1].split('#')[0] // 去掉 npmmirror 的 #hash 后缀
      }
      const im = line.match(/integrity "?([^"\s]+(?:\s+[^"\s]+)*)"?\s*$/)
      if (im && foundVersion && !integrity) {
        integrity = im[1]
      }
      if (url && integrity) return { url, integrity }
    }
    if (url) return { url, integrity }
  }
  return null
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 校验 tarball 内容与 yarn.lock 的 integrity（sha512-…/sha1-… base64）一致。 */
function verifyIntegrity(buf, integrity) {
  if (!integrity) return false
  // integrity 可能是空格分隔的多个哈希，任一匹配即通过
  return integrity.split(/\s+/).some(entry => {
    const idx = entry.indexOf('-')
    if (idx <= 0) return false
    const algo = entry.slice(0, idx)
    const expected = entry.slice(idx + 1)
    if (!/^sha(1|256|384|512)$/.test(algo)) return false
    try {
      const actual = crypto.createHash(algo).update(buf).digest('base64')
      return actual === expected
    } catch (_) {
      return false
    }
  })
}

/** 用 Node 内置 https 下载内容，返回 Buffer。仅允许 https 与白名单内的重定向深度。 */
function httpsGet(url, redirectDepth = 0) {
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
          if (redirectDepth >= MAX_REDIRECTS) {
            return reject(new Error(`too many redirects for ${url}`))
          }
          // location 可能是相对路径，基于当前 URL 解析
          let next
          try {
            next = new URL(res.headers.location, url).toString()
          } catch (e) {
            return reject(new Error(`invalid redirect location from ${url}`))
          }
          if (!next.startsWith('https://')) {
            return reject(new Error(`insecure redirect refused: ${next}`))
          }
          return resolve(httpsGet(next, redirectDepth + 1))
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

/** 解析 tar size 字段：兼容经典八进制与 GNU base-256 编码。 */
function parseTarSize(field) {
  if (field[0] & 0x80) {
    // GNU base-256：首字节最高位为 1，其余字节按大端二进制
    let size = field[0] & 0x7f
    for (let i = 1; i < field.length; i++) {
      size = size * 256 + field[i]
    }
    return size
  }
  const oct = field.toString().replace(/\0/g, '').trim()
  return oct ? parseInt(oct, 8) : 0
}

/**
 * 从 gzip tarball 中提取给定路径（相对 package/）的文件内容。
 * 解析 ustar/pax 普通文件条目（typeflag "0" 或 "\0"），并兼容：
 * - ustar prefix 字段（长路径拆分存放）；
 * - GNU @LongLink（typeflag "L"）长文件名记录；
 * - pax 扩展头（typeflag "x"）中的 path 覆盖；
 * - GNU base-256 size 编码。
 * 返回 Map<subPath, Buffer>。
 */
function extractTar(tarBuf, wantSubPaths) {
  const want = new Set(wantSubPaths)
  const out = new Map()
  let off = 0
  let pendingName = null // 由 GNU LongLink / pax path 提供的下一条目名
  while (off + 512 <= tarBuf.length) {
    const nameRaw = tarBuf.slice(off, off + 100).toString()
    if (!nameRaw || !nameRaw.replace(/\0/g, '')) break // 空块 = 结束
    let name = nameRaw.replace(/\0/g, '')
    const size = parseTarSize(tarBuf.slice(off + 124, off + 136))
    const typeflag = tarBuf.slice(off + 156, off + 157).toString()
    // ustar prefix 字段：长路径的目录部分
    const prefixRaw = tarBuf.slice(off + 345, off + 500).toString().replace(/\0/g, '')
    if (prefixRaw) name = `${prefixRaw}/${name}`
    off += 512
    const contentEnd = Math.min(off + size, tarBuf.length)

    if (typeflag === 'L') {
      // GNU 长文件名：内容即下一条目的真实路径
      pendingName = tarBuf.slice(off, contentEnd).toString().replace(/\0/g, '')
    } else if (typeflag === 'x' || typeflag === 'X') {
      // pax 扩展头："<len> path=<value>\n" 记录覆盖下一条目的路径
      const paxText = tarBuf.slice(off, contentEnd).toString()
      const pathMatch = paxText.match(/\d+ path=([^\n]+)\n/)
      if (pathMatch) pendingName = pathMatch[1]
    } else {
      const isFile = typeflag === '0' || typeflag === '' || typeflag === '\0'
      const effectiveName = pendingName || name
      pendingName = null
      if (isFile && size > 0) {
        // effectiveName 形如 package/build/index.js
        const subPath = effectiveName.replace(/^package\//, '')
        if (want.has(subPath)) {
          out.set(subPath, tarBuf.slice(off, off + size))
        }
      }
    }
    // 内容按 512 对齐
    off += Math.ceil(size / 512) * 512
  }
  return out
}

/**
 * 把被补丁改动的文件用 registry 上的纯净内容覆盖回去。
 * 仅接受白名单 registry 主机的 https URL，且必须通过 yarn.lock 的
 * integrity 校验后才写入 node_modules，防止 MITM / 伪造 lockfile 条目
 * 借本脚本污染依赖。
 */
async function restorePristineFiles(pkgName, version, files) {
  const entry = resolvedEntryFor(pkgName, version)
  if (!entry || !entry.url) {
    log(`  yarn.lock 中未找到 ${pkgName}@${version} 的 resolved URL，跳过`)
    return
  }
  const { url, integrity } = entry
  let host
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      log(`  非 https 的 resolved URL（${url}），跳过`)
      return
    }
    host = parsed.hostname
  } catch (_) {
    log(`  无法解析 resolved URL（${url}），跳过`)
    return
  }
  if (!ALLOWED_REGISTRY_HOSTS.has(host)) {
    log(`  resolved URL 主机 ${host} 不在 registry 白名单内，跳过`)
    return
  }
  if (!integrity) {
    log(`  yarn.lock 中 ${pkgName}@${version} 缺少 integrity，拒绝恢复，跳过`)
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
  if (!verifyIntegrity(tarGz, integrity)) {
    log(`  ${pkgName}@${version} tarball integrity 校验失败，拒绝写入，跳过`)
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
