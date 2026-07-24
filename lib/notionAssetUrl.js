const DEFAULT_NOTION_ORIGIN = 'https://www.notion.so'

const NOTION_WRAPPER_PATHS = ['/image/', '/signed/']

/**
 * Returns true only for URLs whose bytes are hosted by Notion. Generic S3
 * URLs and Notion wrappers around third-party URLs are intentionally rejected.
 */
export function isNotionHostedAssetSource(source) {
  return isNotionHostedAssetSourceInternal(source, 0)
}

/**
 * Returns a third-party source hidden inside a Notion/custom image wrapper.
 * This repairs URLs produced by older NotionNext caches without proxying them.
 */
export function unwrapExternalNotionImageSource(source, notionHost) {
  const wrappedSource = getWrappedSource(source, '/image/', notionHost)
  if (!wrappedSource || isNotionHostedAssetSource(wrappedSource)) return null

  try {
    const url = new URL(wrappedSource)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? wrappedSource
      : null
  } catch {
    return null
  }
}

/**
 * Checks a custom proxy URL by validating the encoded source inside it.
 */
export function isNotionAssetProxyUrl(source, notionHost) {
  try {
    const url = new URL(source)
    if (!isKnownWrapperOrigin(url, notionHost)) return false
    if (url.pathname.startsWith('/images/')) return true

    const prefix = NOTION_WRAPPER_PATHS.find(item =>
      url.pathname.startsWith(item)
    )
    if (!prefix) return false

    const wrappedSource = decodeWrappedPath(url.pathname, prefix)
    return isNotionHostedAssetSource(wrappedSource)
  } catch {
    return false
  }
}

export function mapNotionAssetUrlToProxy(source, notionHost) {
  if (!source || !notionHost || !isNotionAssetProxyUrl(source, notionHost)) {
    return source
  }

  try {
    const sourceUrl = new URL(source)
    const proxyUrl = new URL(notionHost)
    if (sourceUrl.origin === proxyUrl.origin) return source

    return new URL(
      sourceUrl.pathname + sourceUrl.search + sourceUrl.hash,
      proxyUrl.origin
    ).toString()
  } catch {
    return source
  }
}

/**
 * Returns a URL that the same-origin download endpoint can fetch safely.
 * Custom proxy URLs are mapped back to Notion so the endpoint never needs to
 * trust an operator-provided proxy host as an arbitrary upstream.
 */
export function getNotionAssetDownloadSource(source, notionHost) {
  if (isNotionHostedAssetSource(source)) return source
  if (!isNotionAssetProxyUrl(source, notionHost)) return null

  try {
    const sourceUrl = new URL(source)
    return new URL(
      sourceUrl.pathname + sourceUrl.search,
      DEFAULT_NOTION_ORIGIN
    ).toString()
  } catch {
    return null
  }
}

function isNotionHostedAssetSourceInternal(source, depth) {
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
    if (isProdFilesSecureHostname(hostname)) return true
    if (isLegacyNotionS3Path(hostname, pathname)) return true

    if (isNotionHostname(hostname)) {
      if (pathname.startsWith('/images/')) return true

      const prefix = NOTION_WRAPPER_PATHS.find(item =>
        pathname.startsWith(item)
      )
      if (!prefix) return false

      return isNotionHostedAssetSourceInternal(
        decodeWrappedPath(pathname, prefix),
        depth + 1
      )
    }

    return (
      isDomainOrSubdomain(hostname, 'notion.site') &&
      pathname.startsWith('/images/page-cover/')
    )
  } catch {
    return false
  }
}

function getWrappedSource(source, prefix, notionHost) {
  try {
    const url = new URL(source)
    if (!isKnownWrapperOrigin(url, notionHost)) return null
    if (!url.pathname.startsWith(prefix)) return null
    return decodeWrappedPath(url.pathname, prefix)
  } catch {
    return null
  }
}

function isKnownWrapperOrigin(url, notionHost) {
  if (isNotionHostname(url.hostname.toLowerCase())) return true
  if (!notionHost) return false

  try {
    return url.origin === new URL(notionHost).origin
  } catch {
    return false
  }
}

function decodeWrappedPath(pathname, prefix) {
  const encodedSource = pathname.slice(prefix.length)
  try {
    return decodeURIComponent(encodedSource)
  } catch {
    return ''
  }
}

function isNotionHostname(hostname) {
  return hostname === 'notion.so' || hostname.endsWith('.notion.so')
}

function isDomainOrSubdomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function isProdFilesSecureHostname(hostname) {
  return /^prod-files-secure(?:-[a-z0-9]+)?\.s3(?:[.-][a-z0-9-]+)*\.amazonaws\.com$/.test(
    hostname
  )
}

function isLegacyNotionS3Path(hostname, pathname) {
  if (!/^s3(?:[.-][a-z0-9-]+)*\.amazonaws\.com$/.test(hostname)) {
    return false
  }

  const decodedPath = safeDecode(pathname).toLowerCase()
  return (
    decodedPath.startsWith('/secure.notion-static.com/') ||
    decodedPath.startsWith('/prod-files-secure/')
  )
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export { DEFAULT_NOTION_ORIGIN }
