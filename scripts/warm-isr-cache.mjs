#!/usr/bin/env node
/**
 * 部署后预热 ISR 缓存
 *
 * 生产构建只预生成少量优先页面（见 lib/build/staticPaths.js），
 * 其余文章页、标签页、分类页都是 fallback:'blocking'——每次部署后
 * 第一个访客会撞上「冷启动 + 现场抓 Notion」的慢响应（TTFB 2s+）。
 * 本脚本在部署成功后把这些页面全部 GET 一遍，让缓存先于真实访客生成。
 *
 * URL 来源：
 *   1. ${SITE_URL}/sitemap.xml           —— 首页、归档、全部已发布文章
 *   2. 种子页面 / /tag /category /archive —— 提取 /tag/xxx /category/xxx /page/N 链接
 *      （单个标签页、分类页不在 sitemap 里，只能从页面链接发现）
 *
 * 环境变量：
 *   SITE_URL            目标站点，默认 https://619.pp.ua
 *   WARMUP_CONCURRENCY  并发数，默认 4（每个冷页面都会触发 Notion 抓取，别调太高）
 *   WARMUP_LIMIT        最多预热多少个 URL，默认不限制（本地调试用）
 *
 * 用法：node scripts/warm-isr-cache.mjs
 */

const SITE_URL = (process.env.SITE_URL || 'https://619.pp.ua').replace(
  /\/+$/,
  ''
)
const CONCURRENCY = clampInt(process.env.WARMUP_CONCURRENCY, 4, 1, 16)
const LIMIT = clampInt(process.env.WARMUP_LIMIT, Infinity, 1, Infinity)
const REQUEST_TIMEOUT_MS = 45 * 1000 // vercel.json 里页面函数 maxDuration=30s，留出余量
const RETRIES = 1
const USER_AGENT = 'NotionNext-ISR-Warmup/1.0 (+https://github.com/tangly1024/NotionNext)'

const SEED_PATHS = ['/', '/tag', '/category', '/archive']
// 种子页面 HTML 里值得预热的站内链接：标签页、分类页、翻页（含 /tag/xxx/page/2 这类嵌套路径）
const SEED_LINK_PATTERN = /href="(\/(?:tag|category|page)\/[^"#?]+)"/g

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

async function fetchWithTimeout(url, { drain = false } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const started = Date.now()
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT }
    })
    const body = drain ? await res.arrayBuffer() : await res.text()
    return { res, body, elapsedMs: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}

/** 把 sitemap/页面里的绝对链接统一改写到目标站点，其它域名的链接丢弃 */
function toTargetUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, SITE_URL)
    const site = new URL(SITE_URL)
    if (url.hostname !== site.hostname) return null
    return `${SITE_URL}${url.pathname}`
  } catch {
    return null
  }
}

async function collectSitemapUrls() {
  const { body } = await fetchWithTimeout(`${SITE_URL}/sitemap.xml`)
  const urls = []
  for (const match of body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = toTargetUrl(match[1].trim())
    if (url && !url.endsWith('.xml')) urls.push(url)
  }
  return urls
}

async function collectSeedLinks() {
  const urls = []
  for (const path of SEED_PATHS) {
    try {
      const { body } = await fetchWithTimeout(`${SITE_URL}${path}`)
      for (const match of body.matchAll(SEED_LINK_PATTERN)) {
        const url = toTargetUrl(match[1])
        if (url) urls.push(url)
      }
    } catch (error) {
      console.warn(`[warm] seed ${path} failed: ${error.message}`)
    }
  }
  return urls
}

async function warmUrl(url) {
  let lastError = ''
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const { res, elapsedMs } = await fetchWithTimeout(url, { drain: true })
      return { url, ok: res.ok, status: res.status, elapsedMs }
    } catch (error) {
      lastError = error.name === 'AbortError' ? 'timeout' : error.message
    }
  }
  return { url, ok: false, status: 0, error: lastError }
}

async function runPool(urls, concurrency) {
  const queue = [...urls]
  const results = []
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const url = queue.shift()
      const result = await warmUrl(url)
      results.push(result)
      const label = result.ok
        ? `${result.status} ${result.elapsedMs}ms`
        : `FAIL ${result.status || result.error}`
      console.log(`[warm] ${label}  ${url}`)
    }
  })
  await Promise.all(workers)
  return results
}

async function main() {
  console.log(`[warm] target ${SITE_URL} concurrency=${CONCURRENCY}`)
  const started = Date.now()

  const [sitemapUrls, seedUrls] = await Promise.all([
    collectSitemapUrls(),
    collectSeedLinks()
  ])
  // 种子页面本身也在预热列表里（sitemap 已含首页/归档，这里补 /tag /category）
  const seedSelf = ['/tag', '/category'].map(p => `${SITE_URL}${p}`)

  const urls = [...new Set([...sitemapUrls, ...seedSelf, ...seedUrls])].slice(
    0,
    LIMIT === Infinity ? undefined : LIMIT
  )
  console.log(
    `[warm] sitemap=${sitemapUrls.length} discovered=${seedUrls.length} total(dedup)=${urls.length}`
  )

  const results = await runPool(urls, CONCURRENCY)
  const failed = results.filter(r => !r.ok)
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(
    `[warm] done ok=${results.length - failed.length} failed=${failed.length} elapsed=${elapsed}s`
  )

  // 少量失败（页面下线、瞬时超时）不影响整体预热效果；大面积失败才让 CI 变红
  if (failed.length > results.length / 2) {
    console.error('[warm] more than half of the requests failed')
    process.exit(1)
  }
}

main().catch(error => {
  console.error(`[warm] fatal: ${error.message}`)
  process.exit(1)
})
