const NOTION_ORIGIN = 'https://www.notion.so'

// Notion uploaded assets have stable, ID-based URLs. Keep those warm longer.
const IMMUTABLE_EDGE_TTL = 60 * 60 * 24 * 30
const IMMUTABLE_BROWSER_TTL = 60 * 60 * 24 * 7

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

export default {
  async fetch(request) {
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

    const policy = getCachePolicy(url, routeKind)
    const upstreamUrl = createUpstreamUrl(url)
    const hasRange = request.headers.has('range')
    const isFileHeadProbe = routeKind === 'file' && request.method === 'HEAD'
    const isPartialRequest =
      routeKind === 'file' && (hasRange || isFileHeadProbe)
    const upstreamHeaders = {
      Accept: routeKind === 'image' ? IMAGE_ACCEPT : '*/*',
      'User-Agent': USER_AGENT
    }
    if (routeKind === 'file') {
      copyRequestHeader(request.headers, upstreamHeaders, 'Range')
      copyRequestHeader(request.headers, upstreamHeaders, 'If-Range')
    }
    if (isFileHeadProbe) upstreamHeaders.Range = 'bytes=0-0'

    let upstreamResponse
    try {
      // This Worker is middleware around Notion. Using fetch() caching here
      // lets Cloudflare use its global/tiered cache instead of a local-only
      // caches.default lookup on every request.
      upstreamResponse = await fetch(upstreamUrl, {
        // Notion's signed file endpoint rejects HEAD. Fetch one byte instead,
        // then synthesize a standards-compatible HEAD response below.
        method: isFileHeadProbe ? 'GET' : request.method,
        redirect: 'follow',
        headers: upstreamHeaders,
        cf: {
          // A partial response must never become the cache entry for the full
          // asset. Full downloads remain cacheable, while video ranges stream
          // directly so assets above Cloudflare's cache-size limit still play.
          cacheEverything: !isPartialRequest,
          cacheTtlByStatus: {
            '100-199': -1,
            '200-299': policy.edgeTtl,
            '300-599': -1
          }
        }
      })
    } catch (_) {
      return proxyErrorResponse(
        request,
        502,
        routeKind === 'image'
          ? 'Notion image request failed'
          : 'Notion file request failed'
      )
    }

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
      routeKind === 'file'
        ? isFileResponse
        : upstreamResponse.status === 200 && contentType.startsWith('image/')

    // Never turn an upstream error page into a cacheable asset response.
    if (!isValidAsset) {
      const status = upstreamResponse.ok ? 502 : upstreamResponse.status
      if (upstreamResponse.body) await upstreamResponse.body.cancel()
      const message =
        routeKind === 'image'
          ? upstreamResponse.ok
            ? 'Notion did not return an image'
            : 'Notion image request failed'
          : 'Notion file request failed'
      return proxyErrorResponse(request, status, message)
    }

    const headers = copyAssetHeaders(upstreamResponse.headers)
    headers.set(
      'Cache-Control',
      policy.immutable
        ? `public, max-age=${policy.browserTtl}, immutable`
        : `public, max-age=${policy.browserTtl}`
    )

    // This controls Workers Caching when it is enabled for the Worker, without
    // exposing the longer edge TTL to browsers or downstream caches.
    const edgeCacheControl = `public, max-age=${policy.edgeTtl}, stale-while-revalidate=${policy.staleWhileRevalidate}, stale-if-error=${policy.staleIfError}`
    headers.set('Cloudflare-CDN-Cache-Control', edgeCacheControl)
    if (isPartialRequest) {
      headers.set('Cache-Control', 'no-store, max-age=0')
      headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
    }
    if (isFileHeadProbe) normalizeFileHeadHeaders(headers)
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Notion-Image-Proxy', 'v7')
    Object.entries(CORS_HEADERS).forEach(([name, value]) => {
      headers.set(name, value)
    })

    const upstreamCacheStatus =
      upstreamResponse.headers.get('cf-cache-status') || 'UNKNOWN'
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

function createUpstreamUrl(url) {
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
  const decodedPath = safeDecode(url.pathname)
  const immutable =
    routeKind === 'file' ||
    url.pathname.startsWith('/images/') ||
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
    'X-Notion-Image-Proxy': 'v7',
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

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch (_) {
    return value
  }
}

function getRouteKind(pathname) {
  if (pathname.startsWith('/images/')) return 'image'
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
