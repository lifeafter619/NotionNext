const NOTION_ORIGIN = 'https://www.notion.so'
const WALINE_EMOJI_ORIGIN = 'https://unpkg.com'
const PROXY_VERSION = 'v11'

// 图床直读路由前缀：/f/<key> 直接返回 R2 桶中手动上传的对象
const R2_FILE_ROUTE_PREFIX = '/f/'

// 防盗链白名单：只允许这些域名引用图床资源。命中规则：
// - 请求无 Referer（站点设了 no-referrer、或用户直接打开图片链接）→ 放行；
// - 请求的 Referer 主机等于白名单域名，或是其子域名 → 放行；
// - 其余一律 403。
// NotionNext 默认把图片请求设为 referrerPolicy: 'no-referrer'，因此本站请求
// 永远不带 Referer，会落在「无 Referer → 放行」分支，无需改动站点代码。
// 可通过环境变量 ALLOWED_DOMAINS（逗号分隔）覆盖/扩展；未设置时使用下面的默认值。
const DEFAULT_ALLOWED_DOMAINS = [
  '619.pp.ua',
  '66619.eu.org',
  '619-project.eu.org',
  'localhost',
  '127.0.0.1'
]

// Notion uploaded assets have stable, ID-based URLs. Keep those warm longer.
const IMMUTABLE_EDGE_TTL = 60 * 60 * 24 * 30
const IMMUTABLE_BROWSER_TTL = 60 * 60 * 24 * 7

// Cap what a single asset may occupy in the R2 persistence layer so a few
// large videos cannot exhaust the free 10 GB storage tier. Range-streamed
// video bypasses storage anyway; this only bounds rare full downloads.
const R2_MAX_OBJECT_BYTES = 100 * 1024 * 1024

// A fixed format preference maximizes cache sharing between browsers. Notion
// currently returns WebP for the site's image URLs while keeping the original
// image dimensions and quality parameters intact.
const IMAGE_ACCEPT = 'image/avif,image/webp,image/*,*/*;q=0.8'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'

// Keep the response small and preserve only headers useful to <img>, range
// handling, and browser revalidation. Cloudflare adds its own cache headers.
const FORWARDED_RESPONSE_HEADERS = [
  'accept-ranges',
  'content-encoding',
  'content-disposition',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified'
]

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers':
    'Accept-Ranges, Content-Disposition, Content-Length, Content-Range, Content-Type, ETag, Last-Modified'
}

// cf-cache-status values that mean the response body came from Cloudflare's
// cache rather than a live origin round trip.
const CACHE_HIT_STATUSES = ['HIT', 'STALE', 'UPDATING', 'REVALIDATED']

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const routeKind = getRouteKind(url.pathname)

    if (!routeKind) {
      return textResponse(request, 404, 'Not found')
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return textResponse(request, 405, 'Method not allowed', {
        Allow: 'GET, HEAD'
      })
    }

    // 防盗链：所有路由（/image、/signed、/images、/f、Waline emoji）统一校验
    // Referer。本站图片请求不带 Referer（no-referrer），故直接放行；
    // 第三方站点把图嵌到自己页面时，Referer 会是其自身域名，被白名单拒绝。
    if (!isRefererAllowed(request, env)) {
      return textResponse(request, 403, 'Hotlinking not allowed')
    }

    const policy = getCachePolicy(url, routeKind)
    const upstreamUrl = createUpstreamUrl(url)
    const hasRange = request.headers.has('range')
    const isFileHeadProbe = routeKind === 'file' && request.method === 'HEAD'
    const isPartialRequest =
      routeKind === 'file' && (hasRange || isFileHeadProbe)

    // Only complete GET responses participate in any storage layer. Ranges
    // and HEAD probes always stream through untouched.
    const wantsStoredResponse = request.method === 'GET' && !hasRange

    // Layer 1: the per-colo Cache API — fastest, fully Worker-controlled, and
    // identical on every plan. Only validated asset responses are ever stored.
    const edgeCache = wantsStoredResponse ? getEdgeCache() : null
    const edgeCacheKey = edgeCache ? createEdgeCacheKey(url) : null
    if (edgeCache) {
      let cached = null
      try {
        cached = await edgeCache.match(edgeCacheKey)
      } catch (_) {}
      if (cached) {
        const headers = new Headers(cached.headers)
        headers.set('X-Notion-Image-Proxy-Edge-Cache', 'HIT')
        if (isNotModified(request.headers, cached.headers)) {
          if (cached.body) await cached.body.cancel()
          return new Response(null, { status: 304, headers })
        }
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers
        })
      }
    }

    // 图床直读路由：绕过 Notion 上游逻辑，直接读取 R2 中的上传文件。
    // 放在 L1 之后，重复请求仍由本机房缓存直接返回。
    if (routeKind === 'r2-file') {
      return serveBucketFile(request, env, ctx, url, policy, {
        edgeCache,
        edgeCacheKey
      })
    }

    // Layer 2: R2 persistence — global and durable. A colo that has never
    // seen an asset reads it from R2 in ~100ms instead of going back to
    // Notion in seconds, then repopulates its local Cache API copy.
    const bucket = wantsStoredResponse ? getAssetBucket(env) : null
    const r2Key = bucket ? await createR2Key(url) : null
    if (bucket && r2Key) {
      let stored = null
      try {
        stored = await bucket.get(r2Key)
      } catch (_) {}
      if (stored) {
        return respondFromR2(stored, request, policy, {
          edgeCache,
          edgeCacheKey,
          ctx
        })
      }
    }

    const upstreamHeaders = {
      Accept:
        routeKind === 'image' || routeKind === 'waline-emoji-image'
          ? IMAGE_ACCEPT
          : routeKind === 'waline-emoji-info'
            ? 'application/json'
            : '*/*',
      'User-Agent': USER_AGENT
    }
    if (routeKind === 'file') {
      copyRequestHeader(request.headers, upstreamHeaders, 'Range')
      copyRequestHeader(request.headers, upstreamHeaders, 'If-Range')
    }
    if (isFileHeadProbe) upstreamHeaders.Range = 'bytes=0-0'

    let upstreamResponse
    try {
      // Layer 3: fetch() subrequest caching (benefits from Tiered Cache when
      // enabled for the zone). cacheTtl — unlike cacheEverything alone — also
      // overrides upstream no-store/private directives, which Notion's signed
      // asset endpoints send; without the override every request goes back to
      // Notion. A negative TTL disables storage for partial responses so a
      // range slice can never become the cache entry for the full asset.
      upstreamResponse = await fetch(upstreamUrl, {
        // Notion's signed file endpoint rejects HEAD. Fetch one byte instead,
        // then synthesize a standards-compatible HEAD response below.
        method: isFileHeadProbe ? 'GET' : request.method,
        redirect: 'follow',
        headers: upstreamHeaders,
        cf: {
          cacheEverything: !isPartialRequest,
          cacheTtl: isPartialRequest ? -1 : policy.edgeTtl
        }
      })
    } catch (_) {
      return proxyErrorResponse(
        request,
        502,
        getUpstreamFailureMessage(routeKind)
      )
    }

    let upstreamCacheStatus =
      upstreamResponse.headers.get('cf-cache-status') || 'UNKNOWN'
    let validation = validateUpstreamResponse(upstreamResponse, routeKind)

    // Self-heal a poisoned subrequest cache entry: if a cached response turns
    // out to be invalid (an upstream error stored before it could be vetted),
    // bypass the cache once and use the live answer instead. Real, uncached
    // upstream errors are not retried, so failures are never amplified.
    if (
      !validation.isValidAsset &&
      !isPartialRequest &&
      CACHE_HIT_STATUSES.includes(upstreamCacheStatus)
    ) {
      if (upstreamResponse.body) await upstreamResponse.body.cancel()
      try {
        upstreamResponse = await fetch(upstreamUrl, {
          method: request.method,
          redirect: 'follow',
          headers: upstreamHeaders,
          cf: { cacheEverything: false, cacheTtl: -1 }
        })
      } catch (_) {
        return proxyErrorResponse(
          request,
          502,
          getUpstreamFailureMessage(routeKind)
        )
      }
      upstreamCacheStatus = 'BYPASS-RETRY'
      validation = validateUpstreamResponse(upstreamResponse, routeKind)
    }

    // Never turn an upstream error page into a cacheable asset response.
    if (!validation.isValidAsset) {
      const status = upstreamResponse.ok ? 502 : upstreamResponse.status
      if (upstreamResponse.body) await upstreamResponse.body.cancel()
      const message = upstreamResponse.ok
        ? getInvalidUpstreamMessage(routeKind)
        : getUpstreamFailureMessage(routeKind)
      return proxyErrorResponse(request, status, message)
    }

    const headers = copyAssetHeaders(upstreamResponse.headers)
    headers.set('Cache-Control', browserCacheControl(policy))

    // This controls Workers Caching when it is enabled for the Worker, without
    // exposing the longer edge TTL to browsers or downstream caches.
    headers.set('Cloudflare-CDN-Cache-Control', edgeCacheControl(policy))
    if (isPartialRequest) {
      headers.set('Cache-Control', 'no-store, max-age=0')
      headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
    }
    if (isFileHeadProbe) normalizeFileHeadHeaders(headers)
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Notion-Image-Proxy', PROXY_VERSION)
    Object.entries(CORS_HEADERS).forEach(([name, value]) => {
      headers.set(name, value)
    })

    headers.set('X-Notion-Image-Proxy-Origin-Cache', upstreamCacheStatus)

    // Honor browser validators without transferring an unchanged image again.
    // We intentionally compare against the cached upstream representation after
    // fixing Accept, so the validator always refers to the same image format.
    if (
      request.method === 'GET' &&
      !request.headers.has('range') &&
      isNotModified(request.headers, upstreamResponse.headers)
    ) {
      if (upstreamResponse.body) await upstreamResponse.body.cancel()
      return new Response(null, { status: 304, headers })
    }

    // The body from fetch() may already be compressed. encodeBody: manual keeps
    // Cloudflare from applying Content-Encoding a second time while streaming;
    // unencoded formats remain eligible for normal edge compression.
    const encodeBody = headers.has('content-encoding') ? 'manual' : 'automatic'
    if (request.method === 'HEAD' && upstreamResponse.body) {
      await upstreamResponse.body.cancel()
    }

    // Store the validated response. Encoded bodies are skipped so stored bytes
    // always match their headers, and only complete 200 responses are ever
    // stored — errors and ranges never enter any cache layer.
    const storableUpstream =
      wantsStoredResponse &&
      upstreamResponse.status === 200 &&
      !isFileHeadProbe &&
      !headers.has('content-encoding') &&
      Boolean(upstreamResponse.body)

    if (storableUpstream) {
      let clientBody = upstreamResponse.body

      if (edgeCache && edgeCacheKey) {
        const [nextClientBody, cacheBody] = clientBody.tee()
        clientBody = nextClientBody
        const cachePut = edgeCache
          .put(
            edgeCacheKey,
            new Response(cacheBody, {
              status: 200,
              headers: coloCacheHeaders(headers, policy)
            })
          )
          .catch(() => {})
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(cachePut)
        }
      }

      const contentLength = Number(headers.get('content-length'))
      if (
        bucket &&
        r2Key &&
        Number.isFinite(contentLength) &&
        contentLength > 0 &&
        contentLength <= R2_MAX_OBJECT_BYTES
      ) {
        const [nextClientBody, r2Body] = clientBody.tee()
        clientBody = nextClientBody
        const r2Put = putInR2(bucket, r2Key, r2Body, contentLength, headers)
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(r2Put)
        }
      }

      headers.set('X-Notion-Image-Proxy-Edge-Cache', 'MISS')
      return new Response(clientBody, {
        status: 200,
        statusText: upstreamResponse.statusText,
        headers,
        encodeBody
      })
    }

    if (wantsStoredResponse) {
      headers.set('X-Notion-Image-Proxy-Edge-Cache', 'MISS')
    }

    return new Response(
      request.method === 'HEAD' ? null : upstreamResponse.body,
      {
        status: isFileHeadProbe ? 200 : upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers,
        encodeBody
      }
    )
  }
}

function getEdgeCache() {
  try {
    return typeof caches !== 'undefined' && caches?.default
      ? caches.default
      : null
  } catch (_) {
    return null
  }
}

function getAssetBucket(env) {
  return env && env.ASSET_BUCKET ? env.ASSET_BUCKET : null
}

// Same-normalization as the upstream URL: sorting the query collapses
// semantically identical eyeball URLs onto one Cache API entry.
function createEdgeCacheKey(url) {
  const normalized = new URL(url.toString())
  normalized.searchParams.sort()
  normalized.hash = ''
  return new Request(normalized.toString(), { method: 'GET' })
}

// R2 keys hash the normalized path+query (host excluded, so every hostname
// bound to this Worker shares one stored copy). Hashing keeps keys well under
// the 1024-byte R2 limit no matter how long the encoded Notion URL is.
async function createR2Key(url) {
  const normalized = new URL(url.toString())
  normalized.searchParams.sort()
  normalized.hash = ''
  const material = new TextEncoder().encode(
    normalized.pathname + normalized.search
  )
  const digest = await crypto.subtle.digest('SHA-256', material)
  const hex = [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  return `v1/${hex}`
}

function browserCacheControl(policy) {
  return policy.immutable
    ? `public, max-age=${policy.browserTtl}, immutable`
    : `public, max-age=${policy.browserTtl}`
}

function edgeCacheControl(policy) {
  return `public, max-age=${policy.edgeTtl}, stale-while-revalidate=${policy.staleWhileRevalidate}, stale-if-error=${policy.staleIfError}`
}

// The stored colo-cache copy carries s-maxage so the Cache API keeps it for
// the long edge TTL while browsers keep using the shorter max-age.
function coloCacheHeaders(headers, policy) {
  const cacheHeaders = new Headers(headers)
  cacheHeaders.set(
    'Cache-Control',
    `public, s-maxage=${policy.edgeTtl}, max-age=${policy.browserTtl}${policy.immutable ? ', immutable' : ''}`
  )
  cacheHeaders.set('X-Notion-Image-Proxy-Edge-Cache', 'MISS')
  return cacheHeaders
}

function buildForwardedHeaderSnapshot(headers) {
  const snapshot = {}
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    if (name === 'content-encoding' || name === 'content-range') continue
    const value = headers.get(name)
    if (value) snapshot[name] = value
  }
  return snapshot
}

function putInR2(bucket, key, body, contentLength, headers) {
  const options = {
    httpMetadata: {
      contentType: headers.get('content-type') || undefined,
      contentDisposition: headers.get('content-disposition') || undefined
    },
    customMetadata: {
      fwd: JSON.stringify(buildForwardedHeaderSnapshot(headers))
    }
  }

  // R2 needs a known body length. FixedLengthStream provides it in the
  // Workers runtime; elsewhere (tests) the stream is passed through as-is.
  if (typeof FixedLengthStream === 'function') {
    const fixed = new FixedLengthStream(contentLength)
    const pipePromise = body.pipeTo(fixed.writable).catch(() => {})
    const putPromise = bucket.put(key, fixed.readable, options).catch(() => {})
    return Promise.all([pipePromise, putPromise])
  }
  return Promise.resolve(bucket.put(key, body, options)).catch(() => {})
}

function respondFromR2(stored, request, policy, { edgeCache, edgeCacheKey, ctx }) {
  const headers = new Headers()
  try {
    const forwarded = JSON.parse(stored.customMetadata?.fwd || '{}')
    for (const [name, value] of Object.entries(forwarded)) {
      if (typeof value === 'string' && value) headers.set(name, value)
    }
  } catch (_) {}
  if (!headers.has('content-type') && stored.httpMetadata?.contentType) {
    headers.set('Content-Type', stored.httpMetadata.contentType)
  }
  if (stored.size !== undefined && stored.size !== null) {
    headers.set('Content-Length', String(stored.size))
  }
  headers.set('Cache-Control', browserCacheControl(policy))
  headers.set('Cloudflare-CDN-Cache-Control', edgeCacheControl(policy))
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Notion-Image-Proxy', PROXY_VERSION)
  Object.entries(CORS_HEADERS).forEach(([name, value]) => {
    headers.set(name, value)
  })
  headers.set('X-Notion-Image-Proxy-Origin-Cache', 'R2')
  headers.set('X-Notion-Image-Proxy-Edge-Cache', 'R2-HIT')

  if (isNotModified(request.headers, headers)) {
    if (stored.body) {
      Promise.resolve(stored.body.cancel?.()).catch(() => {})
    }
    return new Response(null, { status: 304, headers })
  }

  let clientBody = stored.body
  // Repopulate this colo's Cache API so the next local request is an L1 hit.
  if (edgeCache && edgeCacheKey && clientBody) {
    const [nextClientBody, cacheBody] = clientBody.tee()
    clientBody = nextClientBody
    const cachePut = edgeCache
      .put(
        edgeCacheKey,
        new Response(cacheBody, {
          status: 200,
          headers: coloCacheHeaders(headers, policy)
        })
      )
      .catch(() => {})
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(cachePut)
    }
  }

  return new Response(clientBody, { status: 200, headers })
}

// 图床直读：/f/<key> 返回 R2 桶内手动上传的对象。上传通过控制台、
// wrangler 或 S3 兼容 API 完成，本路由只读，不提供写入端点。
async function serveBucketFile(
  request,
  env,
  ctx,
  url,
  policy,
  { edgeCache, edgeCacheKey }
) {
  const bucket = getAssetBucket(env)
  if (!bucket) {
    return textResponse(request, 404, 'File storage is not configured')
  }

  const key = safeDecode(url.pathname.slice(R2_FILE_ROUTE_PREFIX.length))
  // v1/ 是缓存层的内部命名空间，不通过图床路由暴露
  if (!key || key.startsWith('v1/')) {
    return textResponse(request, 404, 'Not found')
  }

  let object = null
  try {
    object = await bucket.get(key)
  } catch (_) {}
  if (!object || !object.body) {
    return textResponse(request, 404, 'Not found')
  }

  const headers = new Headers()
  headers.set(
    'Content-Type',
    object.httpMetadata?.contentType || guessContentType(key)
  )
  if (object.size !== undefined && object.size !== null) {
    headers.set('Content-Length', String(object.size))
  }
  if (object.httpEtag) {
    headers.set('ETag', object.httpEtag)
  }
  if (object.httpMetadata?.contentDisposition) {
    headers.set('Content-Disposition', object.httpMetadata.contentDisposition)
  }
  headers.set('Cache-Control', browserCacheControl(policy))
  headers.set('Cloudflare-CDN-Cache-Control', edgeCacheControl(policy))
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Notion-Image-Proxy', PROXY_VERSION)
  Object.entries(CORS_HEADERS).forEach(([name, value]) => {
    headers.set(name, value)
  })
  headers.set('X-Notion-Image-Proxy-Origin-Cache', 'R2-FILE')
  headers.set('X-Notion-Image-Proxy-Edge-Cache', 'MISS')

  if (isNotModified(request.headers, headers)) {
    Promise.resolve(object.body.cancel?.()).catch(() => {})
    return new Response(null, { status: 304, headers })
  }

  if (request.method === 'HEAD') {
    Promise.resolve(object.body.cancel?.()).catch(() => {})
    return new Response(null, { status: 200, headers })
  }

  let clientBody = object.body
  if (edgeCache && edgeCacheKey) {
    const [nextClientBody, cacheBody] = clientBody.tee()
    clientBody = nextClientBody
    const cachePut = edgeCache
      .put(
        edgeCacheKey,
        new Response(cacheBody, {
          status: 200,
          headers: coloCacheHeaders(headers, policy)
        })
      )
      .catch(() => {})
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(cachePut)
    }
  }

  return new Response(clientBody, { status: 200, headers })
}

function guessContentType(key) {
  const extension = key.slice(key.lastIndexOf('.') + 1).toLowerCase()
  const types = {
    avif: 'image/avif',
    bmp: 'image/bmp',
    gif: 'image/gif',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    json: 'application/json',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    png: 'image/png',
    svg: 'image/svg+xml',
    txt: 'text/plain; charset=utf-8',
    webm: 'video/webm',
    webp: 'image/webp'
  }
  return types[extension] || 'application/octet-stream'
}

function validateUpstreamResponse(upstreamResponse, routeKind) {
  const contentType = (
    upstreamResponse.headers.get('content-type') || ''
  ).toLowerCase()
  const contentDisposition = (
    upstreamResponse.headers.get('content-disposition') || ''
  ).toLowerCase()
  const isFileResponse =
    [200, 206].includes(upstreamResponse.status) &&
    (!contentType.includes('text/html') ||
      contentDisposition.includes('attachment'))
  const isValidAsset =
    routeKind === 'waline-emoji-info'
      ? upstreamResponse.status === 200 &&
        contentType.includes('application/json')
      : routeKind === 'file'
        ? isFileResponse
        : upstreamResponse.status === 200 && contentType.startsWith('image/')

  return { isValidAsset }
}

function createUpstreamUrl(url) {
  const walineAsset = parseWalineEmojiProxyPath(url.pathname)
  if (walineAsset) {
    return new URL(
      `/@waline/emojis@${walineAsset.version}/${walineAsset.pack}/${walineAsset.filename}`,
      WALINE_EMOJI_ORIGIN
    )
  }

  const upstreamUrl = new URL(url.pathname + url.search, NOTION_ORIGIN)

  // Query order does not change Notion's image result. Sorting it collapses
  // semantically identical URLs onto one cache entry on every Cloudflare plan.
  upstreamUrl.searchParams.sort()
  return upstreamUrl
}

function copyRequestHeader(sourceHeaders, targetHeaders, name) {
  const value = sourceHeaders.get(name)
  if (value) targetHeaders[name] = value
}

function getCachePolicy(url, routeKind) {
  // 图床文件可能被同名覆盖：浏览器与边缘各缓存一天，覆盖后最迟
  // 一天内全网生效；ETag 让浏览器可以低成本重验证。
  if (routeKind === 'r2-file') {
    return {
      immutable: false,
      edgeTtl: 60 * 60 * 24,
      browserTtl: 60 * 60 * 24,
      staleWhileRevalidate: 60 * 60 * 24,
      staleIfError: 60 * 60 * 24 * 30
    }
  }

  const decodedPath = safeDecode(url.pathname)
  const immutable =
    routeKind === 'file' ||
    url.pathname.startsWith('/external/waline-emojis/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    decodedPath.includes('/image/attachment:') ||
    /secure\.notion-static\.com|prod-files-secure|notionusercontent\.com|file\.notion\.(?:so|com)/i.test(
      decodedPath
    )

  return {
    immutable,
    edgeTtl: IMMUTABLE_EDGE_TTL,
    browserTtl: IMMUTABLE_BROWSER_TTL,
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    staleIfError: 60 * 60 * 24 * 30
  }
}

function isNotModified(requestHeaders, responseHeaders) {
  const ifNoneMatch = requestHeaders.get('if-none-match')
  const etag = responseHeaders.get('etag')

  // If-None-Match takes precedence over If-Modified-Since.
  if (ifNoneMatch !== null) {
    if (!etag) return false
    if (ifNoneMatch.trim() === '*') return true

    const normalizedEtag = normalizeWeakEtag(etag)
    return ifNoneMatch
      .split(',')
      .some(value => normalizeWeakEtag(value) === normalizedEtag)
  }

  const ifModifiedSince = requestHeaders.get('if-modified-since')
  const lastModified = responseHeaders.get('last-modified')
  if (!ifModifiedSince || !lastModified) return false

  const requestedTime = Date.parse(ifModifiedSince)
  const modifiedTime = Date.parse(lastModified)
  return (
    Number.isFinite(requestedTime) &&
    Number.isFinite(modifiedTime) &&
    modifiedTime <= requestedTime
  )
}

function normalizeWeakEtag(value) {
  return value.trim().replace(/^W\//i, '')
}

function copyAssetHeaders(sourceHeaders) {
  const headers = new Headers()

  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = sourceHeaders.get(name)
    if (value) headers.set(name, value)
  }

  return headers
}

function normalizeFileHeadHeaders(headers) {
  const contentRange = headers.get('content-range')
  const totalLength = contentRange?.match(/\/([0-9]+)$/)?.[1]
  if (totalLength) headers.set('Content-Length', totalLength)
  headers.delete('Content-Range')
}

function proxyErrorResponse(request, status, message) {
  return textResponse(request, status, message, {
    'Cache-Control': 'no-store, max-age=0',
    'X-Notion-Image-Proxy': PROXY_VERSION,
    'X-Notion-Image-Proxy-Origin-Cache': 'BYPASS',
    ...CORS_HEADERS
  })
}

function textResponse(request, status, message, additionalHeaders = {}) {
  const headers = new Headers({
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': 'text/plain; charset=UTF-8',
    ...CORS_HEADERS,
    ...additionalHeaders
  })

  return new Response(request.method === 'HEAD' ? null : message, {
    status,
    headers
  })
}

/**
 * 防盗链校验。放行规则：
 * - 无 Referer：站点请求默认 referrerPolicy='no-referrer'，浏览器直接打开图片
 *   链接、或部分隐私设置剥除 Referer 的场景也在此列，一律放行；
 * - 有 Referer 且其主机名命中白名单（精确匹配或为白名单域名的子域名）放行；
 * - 否则拒绝。
 *
 * 白名单来源：环境变量 ALLOWED_DOMAINS（逗号分隔）优先；未配置时回落到
 * DEFAULT_ALLOWED_DOMAINS。未配置时仍按默认白名单校验，而非完全放开，
 * 保证线上默认即受保护。
 */
function isRefererAllowed(request, env) {
  const referer = request.headers.get('Referer')
  if (!referer) return true

  let host
  try {
    host = new URL(referer).hostname
  } catch (_) {
    return false
  }
  if (!host) return false

  const allowed = readAllowedDomains(env)
  return allowed.some(domain => host === domain || host.endsWith(`.${domain}`))
}

function readAllowedDomains(env) {
  const fromEnv = env && env.ALLOWED_DOMAINS ? String(env.ALLOWED_DOMAINS) : ''
  const parsed = fromEnv
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_DOMAINS
}

function getUpstreamFailureMessage(routeKind) {
  if (routeKind.startsWith('waline-emoji-')) {
    return 'Waline emoji request failed'
  }
  return routeKind === 'file'
    ? 'Notion file request failed'
    : 'Image request failed'
}

function getInvalidUpstreamMessage(routeKind) {
  if (routeKind === 'waline-emoji-info') {
    return 'Waline did not return emoji metadata'
  }
  if (routeKind === 'waline-emoji-image') {
    return 'Waline did not return an emoji image'
  }
  return routeKind === 'file'
    ? 'Notion did not return a file'
    : 'Notion did not return an image'
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch (_) {
    return value
  }
}

function getRouteKind(pathname) {
  const walineAsset = parseWalineEmojiProxyPath(pathname)
  if (walineAsset) {
    return walineAsset.filename === 'info.json'
      ? 'waline-emoji-info'
      : 'waline-emoji-image'
  }
  if (
    pathname.startsWith(R2_FILE_ROUTE_PREFIX) &&
    pathname.length > R2_FILE_ROUTE_PREFIX.length
  ) {
    return 'r2-file'
  }
  if (pathname.startsWith('/images/')) return 'image'
  // Notion 内置图标库（callout/按钮块图标），如 /icons/downward_blue.svg。
  // 收紧到 .svg 文件名，避免变成 notion.so 任意路径的开放代理
  if (/^\/icons\/[a-zA-Z0-9_-]+\.svg$/.test(pathname)) return 'image'
  if (
    pathname.startsWith('/image/') &&
    isAllowedWrappedNotionAsset(pathname, '/image/')
  ) {
    return 'image'
  }
  if (
    pathname.startsWith('/signed/') &&
    isAllowedWrappedNotionAsset(pathname, '/signed/')
  ) {
    return 'file'
  }
  return null
}

function parseWalineEmojiProxyPath(pathname) {
  const match = pathname.match(
    /^\/external\/waline-emojis\/(\d+\.\d+\.\d+)\/(qq|tieba|weibo|bilibili)\/(info\.json|[a-zA-Z0-9_-]+\.(?:gif|jpe?g|png|webp))$/
  )
  if (!match) return null
  return { version: match[1], pack: match[2], filename: match[3] }
}

function isAllowedWrappedNotionAsset(pathname, prefix) {
  return isNotionHostedAssetSource(safeDecode(pathname.slice(prefix.length)), 0)
}

function isNotionHostedAssetSource(source, depth) {
  if (typeof source !== 'string' || !source || depth > 2) return false
  if (source.startsWith('attachment:')) return true

  try {
    const url = new URL(source)
    if (url.protocol !== 'https:') return false

    const hostname = url.hostname.toLowerCase()
    const pathname = url.pathname

    if (isDomainOrSubdomain(hostname, 'notionusercontent.com')) return true
    if (isDomainOrSubdomain(hostname, 'secure.notion-static.com')) return true
    if (hostname === 'file.notion.so' || hostname === 'file.notion.com') {
      return true
    }
    if (
      /^prod-files-secure(?:-[a-z0-9]+)?\.s3(?:[.-][a-z0-9-]+)*\.amazonaws\.com$/.test(
        hostname
      )
    ) {
      return true
    }

    if (/^s3(?:[.-][a-z0-9-]+)*\.amazonaws\.com$/.test(hostname)) {
      const decodedPath = safeDecode(pathname).toLowerCase()
      return (
        decodedPath.startsWith('/secure.notion-static.com/') ||
        decodedPath.startsWith('/prod-files-secure/')
      )
    }

    if (isNotionHostname(hostname)) {
      if (pathname.startsWith('/images/')) return true

      const prefix = ['/image/', '/signed/'].find(item =>
        pathname.startsWith(item)
      )
      if (!prefix) return false

      return isNotionHostedAssetSource(
        safeDecode(pathname.slice(prefix.length)),
        depth + 1
      )
    }

    return (
      isDomainOrSubdomain(hostname, 'notion.site') &&
      pathname.startsWith('/images/page-cover/')
    )
  } catch (_) {
    return false
  }
}

function isNotionHostname(hostname) {
  return hostname === 'notion.so' || hostname.endsWith('.notion.so')
}

function isDomainOrSubdomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}
