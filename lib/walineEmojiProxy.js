export const WALINE_EMOJI_VERSION = '1.2.0'

const WALINE_EMOJI_PACKS = new Set(['qq', 'tieba', 'weibo', 'bilibili'])
const WALINE_EMOJI_FILE_PATTERN =
  /^(?:info\.json|[a-zA-Z0-9_-]+\.(?:gif|jpe?g|png|webp))$/

export const WALINE_EMOJI_PRIMARY_PRESETS = [...WALINE_EMOJI_PACKS].map(
  pack =>
    `https://npm.elemecdn.com/@waline/emojis@${WALINE_EMOJI_VERSION}/${pack}`
)

export const WALINE_REACTION_PRIMARY_URLS = [
  'agree',
  'look_down',
  'sunglasses',
  'pick_nose',
  'awkward',
  'sleep'
].map(
  name =>
    `https://npm.elemecdn.com/@waline/emojis@${WALINE_EMOJI_VERSION}/tieba/tieba_${name}.png`
)

export function isWalineEmojiAssetSource(source, options = {}) {
  const asset = parseWalineEmojiAssetSource(source, options.notionHost)
  return Boolean(asset && asset.filename !== 'info.json')
}

export function isWalineEmojiInfoSource(source, notionHost) {
  return (
    parseWalineEmojiAssetSource(source, notionHost)?.filename === 'info.json'
  )
}

export function buildWalineEmojiAssetCandidates(source, notionHost) {
  const asset = parseWalineEmojiAssetSource(source, notionHost)
  if (!asset) return []

  const packagePath = `/@waline/emojis@${asset.version}/${asset.pack}/${asset.filename}`
  const unpkgUrl =
    asset.provider === 'unpkg' && !asset.versionWasExplicit
      ? `https://unpkg.com/@waline/emojis/${asset.pack}/${asset.filename}`
      : `https://unpkg.com${packagePath}`
  const candidates = [
    `https://npm.elemecdn.com${packagePath}`,
    buildWalineEmojiProxyUrl(notionHost, asset),
    unpkgUrl,
    `/api/proxy-image?url=${encodeURIComponent(unpkgUrl)}`
  ]

  return [...new Set(candidates.filter(Boolean))]
}

export async function fetchWalineEmojiInfoWithFallback(
  fetchImpl,
  input,
  init,
  notionHost
) {
  const source = getRequestUrl(input)
  const asset = parseWalineEmojiAssetSource(source, notionHost)
  if (!asset || asset.filename !== 'info.json') {
    return fetchImpl(input, init)
  }

  const candidates = buildWalineEmojiAssetCandidates(source, notionHost).slice(
    0,
    3
  )
  let lastError

  for (const candidate of candidates) {
    try {
      const response = await fetchImpl(
        rewriteRequestInput(input, candidate),
        init
      )
      if (response?.ok) return response
      if (response?.body?.cancel) await response.body.cancel()
      lastError = new Error(
        `Waline emoji source responded with ${response?.status}`
      )
    } catch (error) {
      lastError = error
    }
  }

  console.warn('Waline emoji metadata unavailable:', lastError)
  return createEmptyEmojiInfoResponse(asset.pack)
}

export function retryWalineEmojiImage(img, notionHost) {
  const source = getImageSource(img)
  const candidates = buildWalineEmojiAssetCandidates(source, notionHost)
  if (!candidates.length) return false

  const storedTier = Number.parseInt(img?.dataset?.walineEmojiTier || '', 10)
  let nextTier
  if (Number.isInteger(storedTier)) {
    nextTier = storedTier + 1
  } else {
    const currentTier = findCurrentTier(source, candidates, notionHost)
    nextTier = currentTier === 0 ? 1 : 0
  }

  if (nextTier < candidates.length) {
    img.dataset.walineEmojiTier = String(nextTier)
    img.referrerPolicy = 'no-referrer'
    img.removeAttribute('srcset')
    img.setAttribute('src', candidates[nextTier])
    return true
  }

  const fallback = document.createElement('span')
  fallback.className = 'wl-emoji-fallback'
  fallback.textContent = img.alt ? `:${img.alt}:` : '[emoji]'
  img.replaceWith(fallback)
  return true
}

function parseWalineEmojiAssetSource(source, notionHost) {
  if (typeof source !== 'string' || !source) return null

  let url
  try {
    url = new URL(source, 'https://notionnext.local')
  } catch (_) {
    return null
  }

  if (url.pathname === '/api/proxy-image') {
    const target = url.searchParams.get('url')
    return target ? parseWalineEmojiAssetSource(target, notionHost) : null
  }

  const proxyOrigin = getOrigin(notionHost)
  if (proxyOrigin && url.origin === proxyOrigin) {
    const match = url.pathname.match(
      /^\/external\/waline-emojis\/(\d+\.\d+\.\d+)\/(qq|tieba|weibo|bilibili)\/([^/]+)$/
    )
    return match
      ? createParsedAsset('proxy', match[1], match[2], match[3], true)
      : null
  }

  const provider =
    url.hostname === 'npm.elemecdn.com'
      ? 'elemecdn'
      : url.hostname === 'unpkg.com'
        ? 'unpkg'
        : null
  if (!provider) return null

  const match = url.pathname.match(
    /^\/@waline\/emojis(?:@(\d+\.\d+\.\d+))?\/(qq|tieba|weibo|bilibili)\/([^/]+)$/
  )
  if (!match) return null

  return createParsedAsset(
    provider,
    match[1] || WALINE_EMOJI_VERSION,
    match[2],
    match[3],
    Boolean(match[1])
  )
}

function createParsedAsset(
  provider,
  version,
  pack,
  filename,
  versionWasExplicit
) {
  if (
    !WALINE_EMOJI_PACKS.has(pack) ||
    !WALINE_EMOJI_FILE_PATTERN.test(filename)
  ) {
    return null
  }

  return { provider, version, pack, filename, versionWasExplicit }
}

function buildWalineEmojiProxyUrl(notionHost, asset) {
  const origin = getOrigin(notionHost)
  if (!origin) return null
  return `${origin}/external/waline-emojis/${asset.version}/${asset.pack}/${asset.filename}`
}

function getOrigin(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.origin
      : null
  } catch (_) {
    return null
  }
}

function getRequestUrl(input) {
  return typeof input === 'string' ? input : input?.url
}

function rewriteRequestInput(input, url) {
  if (typeof Request === 'function' && input instanceof Request) {
    return new Request(url, input)
  }
  return url
}

function createEmptyEmojiInfoResponse(pack) {
  const body = JSON.stringify({
    name: pack,
    icon: '',
    items: []
  })
  if (typeof Response === 'function') {
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Waline-Emoji-Fallback': 'empty'
      }
    })
  }

  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(body),
    text: async () => body
  }
}

function getImageSource(img) {
  return img?.currentSrc || img?.getAttribute?.('src') || img?.src || ''
}

function findCurrentTier(source, candidates, notionHost) {
  const exactIndex = candidates.findIndex(candidate =>
    areEquivalentUrls(candidate, source)
  )
  if (exactIndex >= 0) return exactIndex

  const sourceUrl = toUrl(source)
  if (!sourceUrl) return -1
  if (sourceUrl.pathname === '/api/proxy-image') return 3
  if (sourceUrl.hostname === 'npm.elemecdn.com') return 0
  if (sourceUrl.hostname === 'unpkg.com') return 2
  if (getOrigin(notionHost) === sourceUrl.origin) return 1
  return -1
}

function areEquivalentUrls(left, right) {
  const leftUrl = toUrl(left)
  const rightUrl = toUrl(right)
  return leftUrl?.href === rightUrl?.href
}

function toUrl(value) {
  try {
    return new URL(value, 'https://notionnext.local')
  } catch (_) {
    return null
  }
}
