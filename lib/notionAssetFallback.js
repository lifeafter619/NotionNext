/**
 * 统一的 Notion 资源加载回退决策。
 *
 * 当来自 Notion 的媒体（图片 / 音频 / 视频）以及站点封面图在客户端加载失败
 * （例如自定义 CDN 的 hotlink 防护返回 403、Worker 故障、signed URL 过期）时，
 * 这里负责按固定优先级逐级给出下一个可尝试的来源。
 *
 * 回退层级（服务端代理优先于 Notion 原域名，因为 www.notion.so 在国内不稳定）：
 *   第1层  服务端代理               ——  跑在自己的 Next.js 服务器上，稳定可控
 *          · 图片：  /api/proxy-image
 *          · 媒体：  /api/notion-file（现签 + 透传任意 content-type）
 *   第2层  www.notion.so 原域名直连  ——  最后兜底，仅在前面全部失败时尝试
 *
 * 项目在 _document 中全局设置了 no-referrer，LazyImage 也显式设置同一策略，
 * 因此失败后以相同 URL 重试不会改变请求条件，只会制造一次重复请求。
 */

import {
  DEFAULT_NOTION_ORIGIN,
  getNotionAssetDownloadSource,
  getOriginalNotionImageSource,
  isNotionAssetProxyUrl
} from '@/lib/notionAssetUrl'

const NOTION_IMAGE_PROXY_ENDPOINT = '/api/proxy-image'
const NOTION_FILE_API_ENDPOINT = '/api/notion-file'

const TIER_SERVER_PROXY = 'Proxy' // 图片
const TIER_FILE_API = 'FileApi' // 媒体
const TIER_ORIGIN = 'Origin'

/**
 * 从一个 <img>/<video>/<audio> 元素上读取当前 src。
 * 兼容 src 属性与 data-src 懒加载占位。
 */
export function getMediaElementSrc(el) {
  if (!el) return null
  return el.getAttribute('src') || el.dataset.src || el.currentSrc || null
}

/**
 * 构建某个资源失败后可逐级尝试的候选来源列表。
 *
 * 每个候选形如 { tier, url }：tier 是层级标识（用于防重入标记），url 是要切到的地址。
 * 列表按优先级排序，已对当前 URL 去重。
 *
 * @param {object}  opts
 * @param {string}  opts.src       当前（已失败的）URL
 * @param {'image'|'media'} opts.kind 资源类型，决定走哪个服务端代理
 * @param {string} [opts.notionHost] 配置的 NOTION_HOST（自定义 CDN/Worker 域名）
 * @returns {{tier:string, url:string}[]} 有序候选，可能为空
 */
export function buildNotionAssetFallbackCandidates({ src, kind, notionHost }) {
  if (!src) return []

  const serverProxyTier = kind === 'image' ? TIER_SERVER_PROXY : TIER_FILE_API
  const rawCandidates = [
    { tier: serverProxyTier, url: buildServerProxyUrl(src, kind, notionHost) },
    { tier: TIER_ORIGIN, url: buildNotionOriginSource(src, kind, notionHost) }
  ]

  // 去掉空值、当前 URL 和重复层级，避免无意义的同地址重试。
  const result = []
  const seen = new Set([src])
  for (const candidate of rawCandidates) {
    if (!candidate.url || seen.has(candidate.url)) continue
    seen.add(candidate.url)
    result.push(candidate)
  }
  return result
}

/**
 * 第2层：服务端代理 URL。
 * - 图片走 /api/proxy-image，参数是映射回 notion.so 的原始源（完全跳过自定义 CDN，
 *   不受其 hotlink 防护影响）。
 * - 媒体走 /api/notion-file，从 Worker 的 /signed/ 包装 URL 解析出 blockId + source，
 *   服务端现签并透传任意 content-type。
 */
function buildServerProxyUrl(src, kind, notionHost) {
  if (kind === 'image') {
    // getNotionAssetDownloadSource 会把自定义代理 URL（img.cdn/image/<encoded>）
    // 映射回 https://www.notion.so/... ，让服务端代理直接回源 Notion。
    const downloadSource = getNotionAssetDownloadSource(src, notionHost)
    if (!downloadSource) return null
    return `${NOTION_IMAGE_PROXY_ENDPOINT}?url=${encodeURIComponent(downloadSource)}`
  }

  // kind === 'media'
  const parsed = parseNotionMediaProxyUrl(src, notionHost)
  if (!parsed) return null
  const params = new URLSearchParams()
  params.set('id', parsed.id)
  params.set('source', parsed.source)
  return `${NOTION_FILE_API_ENDPOINT}?${params.toString()}`
}

/**
 * 第3层：还原成 www.notion.so 原始域名直连。
 * 仅对自定义 CDN 包装的资源有意义；第三方/外部源直接返回 null（不应伪造 notion.so host）。
 */
function buildNotionOriginSource(src, kind, notionHost) {
  if (kind === 'image') {
    // getOriginalNotionImageSource 同时处理：自定义代理包装的 Notion 内部图、
    // 以及 Notion 包装的第三方外链（unwrap）。对纯第三方图返回 null。
    return getOriginalNotionImageSource(src, notionHost)
  }

  // kind === 'media'：仅当 src 是 /signed/ 包装（自定义 CDN 或 notion.so）时，
  // 才把 host 换回 www.notion.so。外部托管的媒体原样返回 null。
  if (!parseNotionMediaProxyUrl(src, notionHost)) return null
  try {
    const url = new URL(src)
    if (url.origin.toLowerCase() === DEFAULT_NOTION_ORIGIN) return null
    return new URL(url.pathname + url.search, DEFAULT_NOTION_ORIGIN).toString()
  } catch {
    return null
  }
}

/**
 * 从 Notion 媒体（video/audio）经过 proxyNotionVideoUrls 改写后的 URL 里，
 * 解析出 blockId 与原始 source。
 *
 * 改写后的形态为：
 *   <notionHost>/signed/<encodeURIComponent(source)>?table=block&id=<blockId>
 * 也兼容 notion.so 自身的 /signed/ 包装。
 *
 * @returns {{id:string, source:string}|null}
 */
export function parseNotionMediaProxyUrl(src, notionHost) {
  if (typeof src !== 'string' || !src) return null

  let url
  try {
    url = new URL(src)
  } catch {
    return null
  }

  const prefix = '/signed/'
  if (!url.pathname.startsWith(prefix)) return null

  // 仅认可已知的包装来源（自定义 CDN 或 notion.so），避免解析任意域名。
  const knownWrapper =
    isNotionAssetProxyUrl(src, notionHost) ||
    url.hostname === 'notion.so' ||
    url.hostname.endsWith('.notion.so')
  if (!knownWrapper) return null

  const id = url.searchParams.get('id')
  let source
  try {
    source = decodeURIComponent(url.pathname.slice(prefix.length))
  } catch {
    return null
  }
  if (!id || !source) return null

  return { id, source }
}

/**
 * 判断一个 URL 是否值得进入回退链（至少能尝试重试）。
 * 非法 URL、空字符串、非 http(s) 的直接放弃。
 */
export function isFallbackCandidate(src) {
  if (!src) return false
  try {
    const url = new URL(src)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const KIND_BY_TAGNAME = {
  IMG: 'image',
  VIDEO: 'media',
  AUDIO: 'media'
}

// dataset 字段：首次失败时固化的候选列表（JSON），以及当前游标位置。
function candidatesKey(kind) {
  return kind === 'image'
    ? 'notionNextFallbackCandidates'
    : 'notionNextMediaFallbackCandidates'
}
function cursorKey(kind) {
  return kind === 'image'
    ? 'notionNextFallbackCursor'
    : 'notionNextMediaFallbackCursor'
}
function sourceKey(kind) {
  return kind === 'image'
    ? 'notionNextFallbackSource'
    : 'notionNextMediaFallbackSource'
}

/**
 * 对一个加载失败的 <img>/<video>/<audio> 元素执行下一层回退。
 *
 * 关键设计：第一次失败时，基于**原始 src** 一次性计算出全部候选 URL 并固化到
 * dataset（JSON），后续失败按游标顺序消费。这样即使 src 中途已切换到回退地址，
 * 也不会因为基于"已变化的 src"重算而丢失后续层级。
 *
 * @param {HTMLElement} el
 * @param {object} opts
 * @param {'image'|'media'} [opts.kind] 资源类型；不传则按 el.tagName 推断
 * @param {string} [opts.notionHost]
 * @returns {boolean} true 表示已切到下一层，false 表示候选已耗尽
 */
export function retryNotionAssetElement(el, opts = {}) {
  if (!el) return false

  const kind = opts.kind || KIND_BY_TAGNAME[el.tagName] || 'image'
  const notionHost = opts.notionHost

  // 读取或初始化固化的候选列表 + 游标。
  const currentSrc = getMediaElementSrc(el)
  let candidates = readCandidates(el, kind)
  let cursor = readCursor(el, kind)

  // React/NotionRenderer 可能复用同一个 DOM 节点。如果 src 已不是上一次应用的
  // 候选，说明元素收到了新资源，旧游标必须作废。
  if (
    candidates &&
    shouldResetFallbackState(el, kind, candidates, cursor, currentSrc)
  ) {
    candidates = null
    cursor = 0
  }

  if (!candidates) {
    if (!isFallbackCandidate(currentSrc)) return false
    candidates = buildNotionAssetFallbackCandidates({
      src: currentSrc,
      kind,
      notionHost
    })
    cursor = 0
    el.dataset[sourceKey(kind)] = currentSrc
    writeCandidates(el, kind, candidates)
    writeCursor(el, kind, cursor)
  }

  while (cursor < candidates.length) {
    const candidate = candidates[cursor]
    writeCursor(el, kind, cursor + 1)
    cursor += 1
    if (candidate && candidate.url) {
      applyFallbackSrc(el, candidate.url, kind)
      return true
    }
  }

  return false
}

function shouldResetFallbackState(el, kind, candidates, cursor, currentSrc) {
  const originalSource = el.dataset[sourceKey(kind)]
  if (!originalSource || !currentSrc) return false

  const lastAppliedSource =
    cursor > 0 ? candidates[cursor - 1]?.url : originalSource
  return Boolean(lastAppliedSource && currentSrc !== lastAppliedSource)
}

function readCandidates(el, kind) {
  const raw = el.dataset[candidatesKey(kind)]
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeCandidates(el, kind, candidates) {
  el.dataset[candidatesKey(kind)] = JSON.stringify(candidates)
}

function readCursor(el, kind) {
  const raw = el.dataset[cursorKey(kind)]
  if (raw == null) return 0
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : 0
}

function writeCursor(el, kind, cursor) {
  el.dataset[cursorKey(kind)] = String(cursor)
}

/**
 * 把回退 URL 应用到元素上。
 * 图片元素补 referrerPolicy='no-referrer'；媒体元素设置 src 后触发 load()。
 */
function applyFallbackSrc(el, candidate, kind) {
  el.removeAttribute('srcset')
  if (kind === 'image' || el.tagName === 'IMG') {
    el.referrerPolicy = 'no-referrer'
  }
  el.setAttribute('src', candidate)
  // 对 <video>/<audio>，设置 src 后需要 load() 才会重新拉取。
  if (typeof el.load === 'function') {
    try {
      el.load()
    } catch {
      /* 某些环境无 load()，忽略 */
    }
  }
}
