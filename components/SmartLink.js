import Link from 'next/link'
import { siteConfig } from '@/lib/config'
import { useRouter } from 'next/router'

// 过滤 <a> 标签不能识别的 props
const filterDOMProps = props => {
  const {
    passHref,
    legacyBehavior,
    placeholderSrc,
    fallbackSrc,
    prefetch,
    replace,
    scroll,
    shallow,
    locale,
    onNavigate,
    ...rest
  } = props
  return rest
}

// 过滤不应该透传给 next/link 的非链接属性
const filterLinkProps = props => {
  const {
    placeholderSrc,
    fallbackSrc,
    src,
    alt,
    width,
    height,
    loading,
    decoding,
    onLoad,
    onError,
    ...rest
  } = props
  return rest
}

// 允许跨页面保留的查询参数白名单：主题预览与语言切换。
// 不能透传全部参数——否则搜索的 ?keyword=、文章解锁的 ?password=、
// utm 等一次性参数会被复制到页面上所有内链并无限传播
const PERSISTED_QUERY_KEYS = ['theme', 'locale', 'lang', 'lite']

const SmartLink = ({ href, children, ...rest }) => {
  const LINK = siteConfig('LINK')
  const router = useRouter()

  // 获取 URL 字符串用于判断是否是外链
  let urlString = ''

  if (typeof href === 'string') {
    urlString = href
  } else if (
    typeof href === 'object' &&
    href !== null &&
    typeof href.pathname === 'string'
  ) {
    urlString = href.pathname
  }

  const siteOrigin = getUrlOrigin(LINK)
  const resolvedUrl = resolveUrl(urlString, LINK)
  const isHttpUrl = ['http:', 'https:'].includes(resolvedUrl?.protocol)
  const isExternal = Boolean(
    isHttpUrl && siteOrigin && resolvedUrl.origin !== siteOrigin
  )
  const isDirectProtocol = ['mailto:', 'tel:', 'sms:'].includes(
    resolvedUrl?.protocol
  )
  const isBlockedProtocol = ['javascript:', 'data:', 'vbscript:'].includes(
    resolvedUrl?.protocol
  )

  const getPersistedQuery = () => {
    const preserved = {}
    for (const key of PERSISTED_QUERY_KEYS) {
      const queryValue = router.query?.[key]
      const value = Array.isArray(queryValue) ? queryValue[0] : queryValue
      if (value !== undefined && value !== null && value !== '') {
        preserved[key] = String(value)
      }
    }
    return preserved
  }

  const mergePreservedQueryForStringHref = value => {
    if (typeof value !== 'string' || !value || value.startsWith('#'))
      return value
    const preservedQuery = getPersistedQuery()
    if (Object.keys(preservedQuery).length === 0) return value

    const isAbsolute =
      value.startsWith('http://') || value.startsWith('https://')
    const url = resolveUrl(value, LINK)
    if (!url) return value
    Object.entries(preservedQuery).forEach(([key, paramValue]) => {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, paramValue)
      }
    })

    if (isAbsolute) return url.toString()
    return `${url.pathname}${url.search}${url.hash}`
  }

  const mergePreservedQueryForObjectHref = value => {
    if (!value || typeof value !== 'object') return value
    const preservedQuery = getPersistedQuery()
    if (Object.keys(preservedQuery).length === 0) return value
    return {
      ...value,
      query: {
        ...preservedQuery,
        ...(value.query || {})
      }
    }
  }

  if (isExternal) {
    // 对于外部链接，必须是 string 类型
    const externalUrl =
      typeof href === 'string' ? href : new URL(href.pathname, LINK).toString()

    const domProps = filterDOMProps(rest)
    return (
      <a
        {...domProps}
        href={externalUrl}
        target='_blank'
        rel='noopener noreferrer'>
        {children}
      </a>
    )
  }

  if (isDirectProtocol) {
    return (
      <a {...filterDOMProps(rest)} href={urlString}>
        {children}
      </a>
    )
  }

  if (isBlockedProtocol) {
    return <span {...filterDOMProps(rest)}>{children}</span>
  }

  // 内部链接（可为对象形式）
  const mergedHref =
    typeof href === 'string'
      ? mergePreservedQueryForStringHref(href)
      : mergePreservedQueryForObjectHref(href)

  return (
    <Link href={mergedHref} {...filterLinkProps(rest)}>
      {children}
    </Link>
  )
}

export default SmartLink

function resolveUrl(value, baseUrl) {
  if (!value || typeof value !== 'string') return null
  try {
    return new URL(value, getValidBaseUrl(baseUrl))
  } catch {
    return null
  }
}

function getValidBaseUrl(value) {
  try {
    return new URL(value).toString()
  } catch {
    return 'https://notionnext.local/'
  }
}

function getUrlOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}
