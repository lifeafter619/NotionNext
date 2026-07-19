import { siteConfig } from '@/lib/config'

function normalizeSubPath(value) {
  const path = String(value || '').trim()
  if (!path || path === '/') return ''
  return `/${path.replace(/^\/+|\/+$/g, '')}`
}

/**
 * Prefix a root-relative HEO route with SUB_PATH while leaving external,
 * relative, query-only and hash-only links untouched.
 */
export function withHeoSubPath(href, subPath = siteConfig('SUB_PATH', '')) {
  if (href && typeof href === 'object') {
    if (typeof href.pathname !== 'string') return href
    return {
      ...href,
      pathname: withHeoSubPath(href.pathname, subPath)
    }
  }

  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) {
    return href
  }

  const normalizedSubPath = normalizeSubPath(subPath)
  if (!normalizedSubPath) return href

  const suffixIndex = href.search(/[?#]/)
  const pathname = suffixIndex >= 0 ? href.slice(0, suffixIndex) : href
  if (
    pathname === normalizedSubPath ||
    pathname.startsWith(`${normalizedSubPath}/`)
  ) {
    return href
  }

  return `${normalizedSubPath}${href}`
}
