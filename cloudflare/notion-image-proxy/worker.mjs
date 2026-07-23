const NOTION_ORIGIN = 'https://www.notion.so'

// Notion uploaded assets have stable, ID-based URLs. Keep those warm longer.
// Wrapped external/bookmark images can change at the same URL, so use shorter
// browser and edge lifetimes for them.
const IMMUTABLE_EDGE_TTL = 60 * 60 * 24 * 30
const IMMUTABLE_BROWSER_TTL = 60 * 60 * 24 * 7
const MUTABLE_EDGE_TTL = 60 * 60 * 24
const MUTABLE_BROWSER_TTL = 60 * 60

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
  'content-type',
  'etag',
  'last-modified'
]

export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (!isAllowedPath(url.pathname)) {
      return textResponse(request, 404, 'Not found')
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return textResponse(request, 405, 'Method not allowed', {
        Allow: 'GET, HEAD'
      })
    }

    const policy = getCachePolicy(url)
    const upstreamUrl = createUpstreamUrl(url)

    let upstreamResponse
    try {
      // This Worker is middleware around Notion. Using fetch() caching here
      // lets Cloudflare use its global/tiered cache instead of a local-only
      // caches.default lookup on every request.
      upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        redirect: 'follow',
        headers: {
          Accept: IMAGE_ACCEPT,
          'User-Agent': USER_AGENT
        },
        cf: {
          cacheEverything: true,
          cacheTtlByStatus: {
            '100-199': -1,
            '200-299': policy.edgeTtl,
            '300-599': -1
          }
        }
      })
    } catch (_) {
      return proxyErrorResponse(request, 502, 'Notion image request failed')
    }

    const contentType = (
      upstreamResponse.headers.get('content-type') || ''
    ).toLowerCase()
    const isImage =
      upstreamResponse.status === 200 && contentType.startsWith('image/')

    // Never turn an HTML/JSON error page into a cacheable image response.
    if (!isImage) {
      const status = upstreamResponse.ok ? 502 : upstreamResponse.status
      if (upstreamResponse.body) await upstreamResponse.body.cancel()
      return proxyErrorResponse(
        request,
        status,
        upstreamResponse.ok
          ? 'Notion did not return an image'
          : 'Notion image request failed'
      )
    }

    const headers = copyImageHeaders(upstreamResponse.headers)
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
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Notion-Image-Proxy', 'v4')

    const upstreamCacheStatus =
      upstreamResponse.headers.get('cf-cache-status') || 'UNKNOWN'
    headers.set('X-Notion-Image-Proxy-Origin-Cache', upstreamCacheStatus)

    // Honor browser validators without transferring an unchanged image again.
    // We intentionally compare against the cached upstream representation after
    // fixing Accept, so the validator always refers to the same image format.
    if (
      request.method === 'GET' &&
      isNotModified(request.headers, upstreamResponse.headers)
    ) {
      if (upstreamResponse.body) await upstreamResponse.body.cancel()
      return new Response(null, { status: 304, headers })
    }

    // The body from fetch() may already be compressed. encodeBody: manual keeps
    // Cloudflare from applying Content-Encoding a second time while streaming;
    // unencoded formats remain eligible for normal edge compression.
    const encodeBody = headers.has('content-encoding') ? 'manual' : 'automatic'
    return new Response(
      request.method === 'HEAD' ? null : upstreamResponse.body,
      {
        status: upstreamResponse.status,
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

function getCachePolicy(url) {
  const decodedPath = safeDecode(url.pathname)
  // Unsplash photo URLs are immutable for the transformed URL shape used by
  // NotionNext (photo id plus explicit width/quality parameters).
  const immutable =
    url.pathname.startsWith('/images/') ||
    decodedPath.includes('/image/attachment:') ||
    /secure\.notion-static\.com|prod-files-secure|notionusercontent\.com|file\.notion\.(?:so|com)|images\.unsplash\.com/i.test(
      decodedPath
    )

  if (immutable) {
    return {
      immutable: true,
      edgeTtl: IMMUTABLE_EDGE_TTL,
      browserTtl: IMMUTABLE_BROWSER_TTL,
      staleWhileRevalidate: 60 * 60 * 24 * 7,
      staleIfError: 60 * 60 * 24 * 30
    }
  }

  return {
    immutable: false,
    edgeTtl: MUTABLE_EDGE_TTL,
    browserTtl: MUTABLE_BROWSER_TTL,
    staleWhileRevalidate: 60 * 60,
    staleIfError: 60 * 60 * 24 * 7
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

function copyImageHeaders(sourceHeaders) {
  const headers = new Headers()

  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = sourceHeaders.get(name)
    if (value) headers.set(name, value)
  }

  return headers
}

function proxyErrorResponse(request, status, message) {
  return textResponse(request, status, message, {
    'Cache-Control': 'no-store, max-age=0',
    'X-Notion-Image-Proxy': 'v4',
    'X-Notion-Image-Proxy-Origin-Cache': 'BYPASS'
  })
}

function textResponse(request, status, message, additionalHeaders = {}) {
  const headers = new Headers({
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': 'text/plain; charset=UTF-8',
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

function isAllowedPath(pathname) {
  return pathname.startsWith('/image/') || pathname.startsWith('/images/')
}
