/**
 *   HEO 主题说明
 *  > 主题设计者 [张洪](https://zhheo.com/)
 *  > 主题开发者 [tangly1024](https://github.com/tangly1024)
 *  1. 开启方式 在blog.config.js 将主题配置为 `HEO`
 *  2. 更多说明参考此[文档](https://docs.tangly1024.com/article/notionnext-heo)
 */

import LazyImage from '@/components/LazyImage'
import LoadingCover from '@/components/LoadingCover'
import replaceSearchResult from '@/components/Mark'
import { siteConfig } from '@/lib/config'
import { blockMapHasCode } from '@/lib/db/notion/cleanBlockMapForClient'
import { useGlobal } from '@/lib/global'
import { isAlgoliaSearchEnabled } from '@/lib/plugins/algoliaConfig'
import { loadWowJS } from '@/lib/plugins/wow'
import { isBrowser } from '@/lib/utils'
import SmartLink from '@/themes/heo/components/HeoLink'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import BlogPostArchive from './components/BlogPostArchive'
import BlogPostListPage from './components/BlogPostListPage'
import BlogPostListScroll from './components/BlogPostListScroll'
import CategoryBar from './components/CategoryBar'
import FloatTocButton from './components/FloatTocButton'
import Footer from './components/Footer'
import Header from './components/Header'
import Hero from './components/Hero'
import LatestPostsGroup from './components/LatestPostsGroup'
import { NoticeBar } from './components/NoticeBar'
import PostHeader from './components/PostHeader'
import { PostLock } from './components/PostLock'
import SearchNav from './components/SearchNav'
import SearchHighlightNav from '@/components/SearchHighlightNav'
import CONFIG from './config'
import { Style } from './style'
import ArticleExpirationNotice from '@/components/ArticleExpirationNotice'
import { isHeoCommentServiceConfigured } from './utils/commentEnabled'
import { withHeoSubPath } from './utils/path'
import usePreserveReadingPositionOnResize from '@/hooks/usePreserveReadingPositionOnResize'

const Comment = dynamic(() => import('@/components/Comment'), { ssr: false })
const ShareBar = dynamic(() => import('@/components/ShareBar'), { ssr: false })
const NotionPage = dynamic(() => import('@/components/NotionPage'), {
  ssr: true
})
const PostAdjacent = dynamic(() => import('./components/PostAdjacent'), {
  ssr: false
})
const PostCopyright = dynamic(() => import('./components/PostCopyright'), {
  ssr: false
})
const PostRecommend = dynamic(() => import('./components/PostRecommend'), {
  ssr: false
})
const AISummary = dynamic(() => import('@/components/AISummary'), {
  ssr: false
})
const WWAds = dynamic(() => import('@/components/WWAds'), { ssr: false })
const SideRight = dynamic(() => import('./components/SideRight'), {
  ssr: false
})
const AdSlot = dynamic(
  () => import('@/components/GoogleAdsense').then(module => module.AdSlot),
  { ssr: false }
)
const Transition = dynamic(() =>
  import('@headlessui/react').then(module => module.Transition)
)

/**
 * 基础布局 采用上中下布局，移动端使用顶部侧边导航栏
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
const LayoutBase = props => {
  const { children, slotTop, className, post } = props

  // 全屏模式下的最大宽度
  const { fullWidth, isDarkMode } = useGlobal()
  const router = useRouter()
  const [showSideRight, setShowSideRight] = useState(false)
  const showHomeBanner =
    siteConfig('HEO_HOME_BANNER_ENABLE', true, CONFIG) !== false

  useEffect(() => {
    if (router.route === '/404') {
      setShowSideRight(false)
      return
    }

    const syncSideRightVisibility = () => {
      setShowSideRight(window.innerWidth >= 1280)
    }

    syncSideRightVisibility()
    window.addEventListener('resize', syncSideRightVisibility)
    return () => {
      window.removeEventListener('resize', syncSideRightVisibility)
    }
  }, [router.route])

  const headerSlot = (
    <header>
      {/* 顶部导航 */}
      <Header {...props} />

      {/* 通知横幅 */}
      {router.route === '/' ? (
        <>
          <NoticeBar />
          {showHomeBanner && <Hero {...props} />}
        </>
      ) : null}
      {post ? <PostHeader {...props} isDarkMode={isDarkMode} /> : null}
    </header>
  )

  // 右侧栏 用户信息+标签列表
  const slotRight =
    router.route === '/404' || !showSideRight ? null : <SideRight {...props} />

  const maxWidth = fullWidth ? 'max-w-[96rem] mx-auto' : 'max-w-[86rem]' // 普通最大宽度是86rem和顶部菜单栏对齐，留空则与窗口对齐

  const HEO_HERO_BODY_REVERSE = siteConfig(
    'HEO_HERO_BODY_REVERSE',
    false,
    CONFIG
  )
  const HEO_LOADING_COVER = siteConfig('HEO_LOADING_COVER', true, CONFIG)
  const HEO_ANIMATE_ON_SCROLL = siteConfig(
    'HEO_ANIMATE_ON_SCROLL',
    true,
    CONFIG
  )

  // 加载wow动画
  useEffect(() => {
    if (HEO_ANIMATE_ON_SCROLL) {
      loadWowJS()
    }
  }, [HEO_ANIMATE_ON_SCROLL])

  return (
    <div
      id='theme-heo'
      className={`${siteConfig('FONT_STYLE')} bg-[var(--heo-color-bg)] dark:bg-[var(--heo-color-bg-dark)] h-full min-h-screen flex flex-col scroll-smooth`}>
      <Style />

      {/* 顶部嵌入 导航栏，首页放hero，文章页放文章详情 */}
      {headerSlot}

      {/* 主区块 */}
      <main
        id='wrapper-outer'
        className={`flex-grow w-full ${maxWidth} mx-auto relative md:px-5`}>
        <div
          id='container-inner'
          className={`${HEO_HERO_BODY_REVERSE ? 'flex-row-reverse' : ''} w-full mx-auto lg:flex justify-center relative z-10`}>
          <div className={`min-w-0 w-full h-auto ${className || ''}`}>
            {/* 主区上部嵌入 */}
            {slotTop}
            {children}
          </div>

          <div className='lg:px-2'></div>

          <div
            id='sideRightSlot'
            className='hidden xl:block h-full w-72 flex-shrink-0'>
            {/* 主区快右侧 */}
            {slotRight}
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <Footer />

      {HEO_LOADING_COVER && <LoadingCover />}
    </div>
  )
}

/**
 * 首页
 * 是一个博客列表，嵌入一个Hero大图
 * @param {*} props
 * @returns
 */
const LayoutIndex = props => {
  return (
    <div id='post-outer-wrapper' className='px-5 md:px-0'>
      {/* 文章分类条 */}
      <CategoryBar {...props} />
      {siteConfig('POST_LIST_STYLE') === 'page' ? (
        <BlogPostListPage {...props} />
      ) : (
        <BlogPostListScroll {...props} />
      )}
    </div>
  )
}

/**
 * 博客列表
 * @param {*} props
 * @returns
 */
const LayoutPostList = props => {
  return (
    <div id='post-outer-wrapper' className='px-5  md:px-0'>
      {/* 文章分类条 */}
      <CategoryBar {...props} />
      {siteConfig('POST_LIST_STYLE') === 'page' ? (
        <BlogPostListPage {...props} />
      ) : (
        <BlogPostListScroll {...props} />
      )}
    </div>
  )
}

/**
 * 搜索
 * @param {*} props
 * @returns
 */
const MAX_SEARCH_SNIPPETS = 3

function getSearchText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' ')
  return value ? String(value) : ''
}

function escapeHtml(value) {
  return getSearchText(value).replace(/[&<>"']/g, char => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[char]
  })
}

function sanitizeAlgoliaHighlight(value) {
  return escapeHtml(value)
    .replace(
      /&lt;span class=(&quot;|&#39;)text-red-500 font-bold\1&gt;/g,
      '<span class="text-red-500 font-bold">'
    )
    .replace(/&lt;\/span&gt;/g, '</span>')
}

function getFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const shanghaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

function formatDate(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''

  const dateParts = shanghaiDateFormatter
    .formatToParts(date)
    .reduce((parts, part) => {
      if (part.type !== 'literal') parts[part.type] = part.value
      return parts
    }, {})
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`
}

function getResultSnippet(results, keyword) {
  if (!Array.isArray(results) || !keyword) return ''
  const snippets = results
    .filter(Boolean)
    .map(result => String(result))
    .filter(result => result.toLowerCase().includes(keyword))
    .slice(0, MAX_SEARCH_SNIPPETS)

  return snippets.join('...')
}

function getBodySnippet(content, keyword) {
  const text = getSearchText(content)
  if (!text || !keyword) return ''

  const lowerText = text.toLowerCase()
  const indexInText = lowerText.indexOf(keyword)
  if (indexInText < 0) return ''

  const start = Math.max(0, indexInText - 50)
  const end = Math.min(text.length, indexInText + 150)
  return `${start > 0 ? '...' : ''}${text.substring(start, end)}${
    end < text.length ? '...' : ''
  }`
}

function algoliaFieldHasMatch(field) {
  if (!field) return false
  if (field.matchLevel && field.matchLevel !== 'none') return true
  if (Array.isArray(field.matchedWords) && field.matchedWords.length > 0) {
    return true
  }
  return /<span\b[^>]*>/.test(String(field.value || ''))
}

function getPostHref(post) {
  if (post?.href) return withHeoSubPath(post.href)
  if (!post?.slug) return '#'
  const slug = String(post.slug)
  if (/^https?:\/\//i.test(slug)) return slug

  const subPath = siteConfig('SUB_PATH', '') || ''
  const normalizedSlug = slug.startsWith('/') ? slug : `/${slug}`
  return withHeoSubPath(`${subPath}${normalizedSlug}` || '/')
}

function postHasTag(post, tagName) {
  return Array.isArray(post?.tags) && post.tags.includes(tagName)
}

function appendKeywordToHref(href, keyword) {
  if (!keyword || !href || href === '#') return href

  try {
    const isAbsolute = /^https?:\/\//i.test(href)
    const base = siteConfig('LINK') || 'https://notionnext.local'
    const url = new URL(href, base)
    url.searchParams.set('keyword', keyword)
    url.search = url.search.replace(/\+/g, '%20')

    if (isAbsolute) return url.toString()
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    const [pathAndQuery, hash = ''] = href.split('#')
    const separator = pathAndQuery.includes('?') ? '&' : '?'
    return `${pathAndQuery}${separator}keyword=${encodeURIComponent(keyword)}${
      hash ? `#${hash}` : ''
    }`
  }
}

function getSearchResultDisplay(post, currentSearch, isAlgolia) {
  let displayContent = getSearchText(post?.summary)
  let displayTitle = getSearchText(post?.title) || '未命名'
  let showJumpButton = false
  let matchLocation = ''

  if (isAlgolia) {
    const contentMatch = algoliaFieldHasMatch(post?._snippetResult?.content)
    const summaryMatch = algoliaFieldHasMatch(post?._snippetResult?.summary)
    const titleMatch = algoliaFieldHasMatch(post?._highlightResult?.title)
    const highlightedSummary = sanitizeAlgoliaHighlight(post.summary)
    const highlightedTitle = sanitizeAlgoliaHighlight(post.title)

    return {
      displayContent: highlightedSummary ? (
        <span dangerouslySetInnerHTML={{ __html: highlightedSummary }} />
      ) : (
        ''
      ),
      displayTitle: (
        <span
          dangerouslySetInnerHTML={{
            __html: highlightedTitle || '未命名'
          }}
        />
      ),
      showJumpButton: contentMatch,
      matchLocation: contentMatch
        ? '文章内容'
        : summaryMatch
          ? '摘要'
          : titleMatch
            ? '标题'
            : ''
    }
  }

  const keyword = getSearchText(currentSearch).trim().toLowerCase()
  if (!keyword) {
    return { displayContent, displayTitle, showJumpButton, matchLocation }
  }

  const resultSnippet = getResultSnippet(post.results, keyword)
  if (resultSnippet) {
    return {
      displayContent: resultSnippet,
      displayTitle,
      showJumpButton: true,
      matchLocation: '文章内容'
    }
  }

  const titleMatch = getSearchText(post.title).toLowerCase().includes(keyword)
  const summaryMatch = getSearchText(post.summary)
    .toLowerCase()
    .includes(keyword)
  const bodySnippet = getBodySnippet(post.content, keyword)

  if (bodySnippet) {
    displayContent = bodySnippet
    showJumpButton = true
    matchLocation = '文章内容'
  } else if (summaryMatch) {
    matchLocation = '摘要'
  } else if (titleMatch) {
    matchLocation = '标题'
  }

  return { displayContent, displayTitle, showJumpButton, matchLocation }
}

const SearchInlineStatus = ({ currentSearch }) => (
  <div
    role='status'
    aria-live='polite'
    className='mb-4 flex items-center gap-3 rounded-lg border border-yellow-300/70 bg-yellow-50 px-4 py-3 text-sm text-gray-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-gray-200'>
    <span className='h-2 w-2 rounded-full bg-yellow-500 animate-pulse' />
    <span className='font-medium'>正在搜索</span>
    {currentSearch && (
      <span className='min-w-0 truncate text-gray-500 dark:text-gray-400'>
        {currentSearch}
      </span>
    )}
  </div>
)

const SearchSkeletonRows = () => (
  <div aria-hidden='true' className='space-y-4'>
    {[0, 1, 2].map(index => (
      <div
        key={index}
        className='rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1e1e1e]'>
        <div className='h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700' />
        <div className='mt-3 h-3 w-full rounded bg-gray-100 dark:bg-gray-800' />
        <div className='mt-2 h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-800' />
      </div>
    ))}
  </div>
)

const SearchErrorState = ({ onRetry }) => (
  <div
    role='alert'
    className='mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center dark:border-red-500/30 dark:bg-red-500/10'>
    <p className='font-medium text-red-700 dark:text-red-300'>
      搜索服务暂时不可用，请稍后重试
    </p>
    <button
      type='button'
      onClick={onRetry}
      className='mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400'>
      重试
    </button>
  </div>
)

const LayoutSearch = props => {
  const { keyword, posts } = props
  const router = useRouter()
  const currentSearch = getSearchText(keyword || router?.query?.s)
  const { locale } = useGlobal()
  const [sortOrder, setSortOrder] = useState('relevance')
  const [viewMode, setViewMode] = useState('list') // list or grid
  const [algoliaState, setAlgoliaState] = useState({
    status: 'idle',
    hits: []
  })
  const [retryToken, setRetryToken] = useState(0)
  const searchGenerationRef = useRef(0)

  // 检查是否开启 Algolia
  const enableAlgolia = isAlgoliaSearchEnabled(siteConfig)

  useEffect(() => {
    if (!enableAlgolia || !currentSearch) {
      searchGenerationRef.current += 1
      setAlgoliaState({ status: 'idle', hits: [] })
      return
    }

    const generation = ++searchGenerationRef.current
    const isCurrentGeneration = () => searchGenerationRef.current === generation
    setAlgoliaState({ status: 'loading', hits: [] })
    const runAlgoliaSearch = async () => {
      try {
        const algoliaModule = await import('algoliasearch')
        if (!isCurrentGeneration()) return

        const createAlgoliaClient = algoliaModule.default || algoliaModule
        const client = createAlgoliaClient(
          siteConfig('ALGOLIA_APP_ID'),
          siteConfig('ALGOLIA_SEARCH_ONLY_APP_KEY')
        )
        const index = client.initIndex(siteConfig('ALGOLIA_INDEX'))
        const { hits } = await index.search(currentSearch, {
          attributesToSnippet: ['content:150', 'summary:100'],
          highlightPreTag: '<span class="text-red-500 font-bold">',
          highlightPostTag: '</span>'
        })

        if (!isCurrentGeneration()) return
        const uniqueHitsMap = new Map()
        const searchHits = Array.isArray(hits) ? hits : []
        searchHits.forEach(hit => {
          const key = hit?.slug || hit?.objectID
          if (key && !uniqueHitsMap.has(key)) {
            uniqueHitsMap.set(key, hit)
          }
        })
        const uniqueHits = Array.from(uniqueHitsMap.values())

        const mappedHits = uniqueHits.map(hit => ({
          ...hit,
          id: hit.objectID,
          title: hit._highlightResult?.title?.value || hit.title,
          summary:
            hit._snippetResult?.summary?.value ||
            hit._snippetResult?.content?.value ||
            hit.summary,
          slug: hit.slug,
          href: getPostHref(hit),
          createdTime: hit.createdTime || hit.createdTimestamp
        }))
        setAlgoliaState({
          status: mappedHits.length > 0 ? 'success' : 'empty',
          hits: mappedHits
        })
      } catch {
        if (!isCurrentGeneration()) return
        setAlgoliaState({ status: 'error', hits: [] })
      }
    }
    runAlgoliaSearch()

    return () => {
      if (isCurrentGeneration()) searchGenerationRef.current += 1
    }
  }, [currentSearch, enableAlgolia, retryToken])

  // 优先使用 Algolia 结果，否则使用本地结果
  const displayPosts = useMemo(() => {
    const hasSettledAlgoliaResults =
      algoliaState.status === 'success' || algoliaState.status === 'empty'
    const sourcePosts =
      enableAlgolia && hasSettledAlgoliaResults
        ? algoliaState.hits
        : Array.isArray(posts)
          ? posts
          : []
    return sourcePosts.filter(
      post => post?.slug || post?.objectID || post?.href
    )
  }, [algoliaState, enableAlgolia, posts])
  const usingAlgoliaResults = enableAlgolia && algoliaState.status === 'success'

  // 对搜索结果进行排序 - 使用 useMemo 优化性能
  const sortedPosts = useMemo(() => {
    if (!displayPosts) return []
    return [...displayPosts].sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdTime || 0) - new Date(a.createdTime || 0)
      } else if (sortOrder === 'oldest') {
        return new Date(a.createdTime || 0) - new Date(b.createdTime || 0)
      }
      return 0 // relevance - 保持原始顺序
    })
  }, [displayPosts, sortOrder])

  // 本地搜索高亮 (Algolia 自带高亮，不需要这个)
  useEffect(() => {
    if (!currentSearch || usingAlgoliaResults || !isBrowser) {
      return
    }

    let isAborted = false
    const markResults = () => {
      if (!isAborted) {
        replaceSearchResult({
          doms: document.getElementsByClassName('replace'),
          search: currentSearch,
          target: {
            element: 'span',
            className: 'text-red-500 border-b border-dashed'
          }
        })
      }
    }

    if (window.requestIdleCallback) {
      const taskId = window.requestIdleCallback(markResults, { timeout: 600 })
      return () => {
        isAborted = true
        window.cancelIdleCallback(taskId)
      }
    }

    const timeoutId = window.setTimeout(markResults, 80)
    return () => {
      isAborted = true
      window.clearTimeout(timeoutId)
    }
    // 切换视图（list/grid）或排序会重建/重排结果卡片，需要重新执行关键词高亮
  }, [currentSearch, sortedPosts, usingAlgoliaResults, viewMode])

  const hasSearch = Boolean(currentSearch)
  const hasResults = sortedPosts.length > 0
  const loading = enableAlgolia && algoliaState.status === 'loading'
  const hasSearchError = enableAlgolia && algoliaState.status === 'error'

  return (
    <div id='search-page-wrapper' className='px-5 md:px-0'>
      <SearchNav {...props} />
      <div className='mt-6'>
        {hasSearch && (
          <div className='mb-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-[#1e1e1e]'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <div>
                <h1 className='text-2xl font-bold dark:text-white flex items-center gap-2'>
                  <i className='fas fa-search text-yellow-500'></i>
                  搜索结果
                </h1>
                <p className='text-gray-600 dark:text-gray-400 mt-1'>
                  找到{' '}
                  <span className='font-bold text-gray-900 dark:text-yellow-500'>
                    {sortedPosts.length}
                  </span>{' '}
                  篇关于
                  <span className='font-bold mx-1'>
                    {'"'}
                    {currentSearch}
                    {'"'}
                  </span>{' '}
                  的文章
                </p>
              </div>

              {/* 排序和视图控制 */}
              <div className='flex items-center gap-3'>
                {/* 排序选择 */}
                <div className='flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1'>
                  <button
                    onClick={() => setSortOrder('relevance')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      sortOrder === 'relevance'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-yellow-500 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}>
                    <i className='fas fa-star mr-1'></i>相关
                  </button>
                  <button
                    onClick={() => setSortOrder('newest')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      sortOrder === 'newest'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-yellow-500 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}>
                    <i className='fas fa-clock mr-1'></i>最新
                  </button>
                  <button
                    onClick={() => setSortOrder('oldest')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      sortOrder === 'oldest'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-yellow-500 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}>
                    <i className='fas fa-history mr-1'></i>最早
                  </button>
                </div>

                {/* 视图切换 */}
                <div className='flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1'>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-yellow-500 shadow'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                    <i className='fas fa-list'></i>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-yellow-500 shadow'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                    <i className='fas fa-th-large'></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && <SearchInlineStatus currentSearch={currentSearch} />}

        {hasSearchError && (
          <SearchErrorState onRetry={() => setRetryToken(token => token + 1)} />
        )}

        {(loading ||
          hasResults ||
          (hasSearch && !hasResults && !hasSearchError)) && (
          <div id='posts-wrapper'>
            {hasResults ? (
              viewMode === 'list' ? (
                <div className='space-y-4'>
                  {sortedPosts.map((post, index) => (
                    <SearchResultCard
                      key={post.id || post.slug || post.objectID || index}
                      post={post}
                      index={index}
                      currentSearch={currentSearch}
                      siteInfo={props.siteInfo}
                      isAlgolia={usingAlgoliaResults}
                    />
                  ))}
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {sortedPosts.map((post, index) => (
                    <SearchResultGridCard
                      key={post.id || post.slug || post.objectID || index}
                      post={post}
                      index={index}
                      currentSearch={currentSearch}
                      siteInfo={props.siteInfo}
                      isAlgolia={usingAlgoliaResults}
                    />
                  ))}
                </div>
              )
            ) : loading ? (
              <SearchSkeletonRows />
            ) : (
              <div className='text-center py-16 bg-white dark:bg-[#1e1e1e] rounded-lg'>
                <i className='fas fa-search text-6xl text-gray-300 dark:text-gray-600 mb-4'></i>
                <p className='text-xl text-gray-600 dark:text-gray-400'>
                  未找到相关文章
                </p>
                <p className='text-gray-500 dark:text-gray-500 mt-2'>
                  尝试使用不同的关键词搜索
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 搜索结果卡片 - 列表视图
 */
const SearchMatchIndicator = ({ canJump, matchLocation, onJump }) => {
  if (!matchLocation) return null

  if (!canJump) {
    return (
      <div className='mt-2 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
        <i className='fas fa-location-dot' aria-hidden='true' />
        <span>匹配位置 </span>
        <span>{`(${matchLocation})`}</span>
      </div>
    )
  }

  return (
    <button
      type='button'
      className='mt-2 inline-flex items-center gap-1 rounded-md bg-yellow-50 px-3 py-1.5 text-xs font-bold text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-500/10 dark:text-yellow-400 dark:hover:bg-yellow-500/20 transition-colors'
      onClick={onJump}
      aria-label={`跳转到搜索位置（${matchLocation}）`}>
      <i className='fas fa-search-location' aria-hidden='true' />
      <span>跳转到搜索位置</span>
      <span className='text-gray-500 dark:text-gray-400'>
        {` (${matchLocation})`}
      </span>
    </button>
  )
}

const SearchResultCard = ({
  post,
  index,
  currentSearch,
  siteInfo,
  isAlgolia = false
}) => {
  const router = useRouter()
  const showCover = post?.pageCoverThumbnail || siteInfo?.pageCover
  const { displayContent, displayTitle, showJumpButton, matchLocation } =
    getSearchResultDisplay(post, currentSearch, isAlgolia)
  const postHref = getPostHref(post)
  const hrefWithKeyword = appendKeywordToHref(postHref, currentSearch)
  const canJumpToMatch = showJumpButton && postHref !== '#'
  const postTags = Array.isArray(post?.tags)
    ? post.tags.map(tag => getSearchText(tag)).filter(Boolean)
    : []
  const createdDate = formatDate(post?.createdTime)
  const titleText = getSearchText(post?.title) || '未命名'
  const category = getSearchText(post?.category)

  return (
    <article className='replace bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex gap-4 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors duration-200 group'>
      {/* 封面图 - 使用 object-contain 保证图片完整显示 */}
      {showCover && (
        <SmartLink
          href={postHref}
          className='w-32 h-24 md:w-40 md:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
          <LazyImage
            priority={index === 0}
            width={180}
            height={126}
            sizes='(min-width: 720px) 10rem, 8rem'
            src={post?.pageCoverThumbnail || siteInfo?.pageCover}
            alt={titleText}
            className='max-w-full max-h-full object-contain'
          />
        </SmartLink>
      )}
      {/* 文章信息 */}
      <div className='flex-1 flex flex-col justify-between min-w-0'>
        <div>
          <SmartLink href={postHref} className='block'>
            <h3 className='text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors line-clamp-2'>
              {displayTitle}
            </h3>
            {displayContent && (
              <div className='text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-md'>
                {displayContent}
              </div>
            )}
          </SmartLink>
          <SearchMatchIndicator
            canJump={canJumpToMatch}
            matchLocation={matchLocation}
            onJump={() => void router.push(hrefWithKeyword)}
          />
        </div>
        <div className='flex items-center flex-wrap gap-3 mt-2 text-xs text-gray-500'>
          {category && (
            <span className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md'>
              <i className='fas fa-folder mr-1'></i>
              {category}
            </span>
          )}
          {postTags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md'>
              #{tag}
            </span>
          ))}
          {createdDate && (
            <span>
              <i className='fas fa-calendar mr-1'></i>
              {createdDate}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * 搜索结果卡片 - 网格视图
 */
const SearchResultGridCard = ({
  post,
  index,
  currentSearch,
  siteInfo,
  isAlgolia = false
}) => {
  const router = useRouter()
  const showCover = post?.pageCoverThumbnail || siteInfo?.pageCover
  const { displayContent, displayTitle, showJumpButton, matchLocation } =
    getSearchResultDisplay(post, currentSearch, isAlgolia)
  const postHref = getPostHref(post)
  const canJumpToMatch = showJumpButton && postHref !== '#'
  const hrefWithFragment = showJumpButton
    ? appendKeywordToHref(postHref, currentSearch)
    : postHref
  const createdDate = formatDate(post?.createdTime)
  const titleText = getSearchText(post?.title) || '未命名'
  const category = getSearchText(post?.category)

  return (
    <article className='replace bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors duration-200 group h-full flex flex-col'>
      {/* 封面图 - 使用 object-contain 保证图片完整显示 */}
      {showCover && (
        <SmartLink
          href={postHref}
          className='w-full h-40 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
          <LazyImage
            priority={index === 0}
            width={360}
            height={160}
            sizes='(min-width: 720px) 33vw, 100vw'
            src={post?.pageCoverThumbnail || siteInfo?.pageCover}
            alt={titleText}
            className='max-w-full max-h-full object-contain'
          />
        </SmartLink>
      )}
      {/* 文章信息 */}
      <div className='p-4 flex-1 flex flex-col justify-between'>
        <div>
          <SmartLink href={postHref} className='block'>
            <h3 className='font-bold text-gray-800 dark:text-gray-100 group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors'>
              {displayTitle}
            </h3>
            {displayContent && (
              <div className='text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-md'>
                {displayContent}
              </div>
            )}
          </SmartLink>
          <SearchMatchIndicator
            canJump={canJumpToMatch}
            matchLocation={matchLocation}
            onJump={() => void router.push(hrefWithFragment)}
          />
        </div>
        <div className='flex items-center gap-2 mt-3 text-xs text-gray-500'>
          {category && (
            <span className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md'>
              {category}
            </span>
          )}
          {createdDate && <span>{createdDate}</span>}
        </div>
      </div>
    </article>
  )
}

/**
 * 归档
 * @param {*} props
 * @returns
 */
const LayoutArchive = props => {
  const { archivePosts } = props
  const safeArchivePosts =
    archivePosts && typeof archivePosts === 'object' ? archivePosts : {}

  // 归档页顶部显示条，如果是默认归档则不显示。分类详情页显示分类列表，标签详情页显示当前标签

  return (
    <div className='p-5 rounded-xl border dark:border-gray-600 max-w-6xl w-full bg-[var(--heo-color-card)] dark:bg-[var(--heo-color-card-dark)]'>
      {/* 文章分类条 */}
      <CategoryBar {...props} border={false} />

      <div className='px-3'>
        {Object.keys(safeArchivePosts).map(archiveTitle => (
          <BlogPostArchive
            key={archiveTitle}
            posts={safeArchivePosts[archiveTitle]}
            archiveTitle={archiveTitle}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * 文章详情
 * @param {*} props
 * @returns
 */
const LayoutSlug = props => {
  const { post, lock, validPassword } = props
  const { locale, fullWidth } = useGlobal()
  const postIdentity = post?.id || post?.slug || post?.title
  usePreserveReadingPositionOnResize(postIdentity)
  const [recommendedPostId, setRecommendedPostId] = useState(null)
  const showRecommended = Boolean(
    postIdentity && recommendedPostId === postIdentity
  )

  // 从 blockMap 判断是否包含代码块（兼容压缩数据），随文章切换即时更新，
  // 避免客户端导航后沿用上一篇文章的宽度布局
  const hasCode = useMemo(() => blockMapHasCode(post?.blockMap), [post])

  const commentEnable = isHeoCommentServiceConfigured()

  const router = useRouter()
  const waiting404 = siteConfig('POST_WAITING_TIME_FOR_404') * 1000

  // 监听滚动，延迟加载底部推荐和评论
  useEffect(() => {
    if (!postIdentity) return
    if (typeof IntersectionObserver !== 'function') {
      setRecommendedPostId(postIdentity)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setRecommendedPostId(postIdentity)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )
    const target = document.getElementById('article-end-observer')
    if (target) {
      observer.observe(target)
    }
    return () => observer.disconnect()
  }, [postIdentity])

  useEffect(() => {
    // 404
    if (!post) {
      const timer = setTimeout(() => {
        if (isBrowser) {
          const article = document.querySelector(
            '#article-wrapper #notion-article'
          )
          if (!article) {
            router.push(withHeoSubPath('/404'))
          }
        }
      }, waiting404)
      return () => clearTimeout(timer)
    }
  }, [post, router, waiting404])

  return (
    <>
      <div
        className={`article h-full w-full ${fullWidth ? '' : 'xl:max-w-5xl'} ${hasCode ? 'xl:w-[73.15vw]' : ''}  bg-[var(--heo-color-card)] dark:bg-[var(--heo-color-bg-dark)] dark:border-gray-600 lg:hover:shadow lg:border rounded-2xl lg:px-2 lg:py-4 `}>
        {/* 文章锁 */}
        {lock && <PostLock validPassword={validPassword} />}

        {!lock && post && (
          <div className='mx-auto md:w-full md:px-5'>
            {/* 文章主体 */}
            <article id='article-wrapper'>
              {/* Notion文章主体 */}
              <section
                className='wow fadeInUp p-5 justify-center mx-auto'
                data-wow-delay='.2s'>
                <ArticleExpirationNotice post={post} />
                <AISummary aiSummary={post.aiSummary} />
                <WWAds orientation='horizontal' className='w-full' />
                {post && <NotionPage post={post} />}
                <WWAds orientation='horizontal' className='w-full' />
              </section>

              {/* 用于检测滚动的锚点 */}
              <div id='article-end-observer' className='h-1' />

              {/* 上一篇\下一篇文章 */}
              <PostAdjacent {...props} />

              {/* 延迟加载底部区域 */}
              {showRecommended && (
                <div className='animate-fade-in'>
                  {/* 分享 */}
                  <ShareBar post={post} />
                  {post?.type === 'Post' && (
                    <div className='px-5'>
                      {/* 版权 */}
                      <PostCopyright {...props} />
                      {/* 文章推荐 */}
                      <PostRecommend {...props} />
                    </div>
                  )}
                </div>
              )}
            </article>

            {/* 评论区 */}
            {fullWidth ? null : (
              <div id='post-comments' className='px-5'>
                <div
                  className={`${commentEnable && post && showRecommended ? '' : 'hidden'}`}>
                  <hr className='my-4 border-dashed' />
                  {/* 评论区上方广告 */}
                  <div className='py-2'>
                    <AdSlot />
                  </div>
                  {/* 评论互动 */}
                  <div className='duration-200 overflow-x-auto'>
                    <div className='text-2xl dark:text-white'>
                      <i className='fas fa-comment mr-1' />
                      {locale.COMMON.COMMENTS}
                    </div>
                    <Comment frontMatter={post} className='' />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <FloatTocButton
        {...props}
        commentEnabled={Boolean(commentEnable && !fullWidth)}
      />
      <SearchHighlightNav />
    </>
  )
}

/**
 * 404
 * @param {*} props
 * @returns
 */
const Layout404 = props => {
  // const { meta, siteInfo } = props
  const { onLoading, fullWidth } = useGlobal()
  return (
    <>
      {/* 主区块 */}
      <main
        id='wrapper-outer'
        className={`flex-grow ${fullWidth ? '' : 'max-w-4xl'} w-screen mx-auto px-5`}>
        <div id='error-wrapper' className={'w-full mx-auto justify-center'}>
          <Transition
            show={!onLoading}
            appear={true}
            enter='transition ease-in-out duration-700 transform order-first'
            enterFrom='opacity-0 translate-y-16'
            enterTo='opacity-100'
            leave='transition ease-in-out duration-300 transform'
            leaveFrom='opacity-100 translate-y-0'
            leaveTo='opacity-0 -translate-y-16'
            unmount={false}>
            {/* 404卡牌 */}
            <div className='error-content flex flex-col md:flex-row w-full mt-12 h-[30rem] md:h-96 justify-center items-center bg-white dark:bg-[#1B1C20] border dark:border-gray-800 rounded-3xl'>
              {/* 左侧动图 */}
              <LazyImage
                className='error-img h-60 md:h-full p-4'
                width={360}
                height={260}
                sizes='(min-width: 720px) 360px, 80vw'
                alt='404'
                src={
                  'https://bu.dusays.com/2023/03/03/6401a7906aa4a.gif'
                }></LazyImage>

              {/* 右侧文字 */}
              <div className='error-info flex-1 flex flex-col justify-center items-center space-y-4'>
                <h1 className='error-title font-extrabold md:text-9xl text-7xl dark:text-white'>
                  404
                </h1>
                <div className='dark:text-white'>请尝试站内搜索寻找文章</div>
                <SmartLink
                  href='/'
                  className='bg-blue-500 py-2 px-4 text-white shadow rounded-lg hover:bg-blue-600 hover:shadow-md duration-200 transition-all'>
                  回到主页
                </SmartLink>
              </div>
            </div>

            {/* 404页面底部显示最新文章 */}
            <div className='mt-12'>
              <LatestPostsGroup {...props} />
            </div>
          </Transition>
        </div>
      </main>
    </>
  )
}

/**
 * 分类列表
 * @param {*} props
 * @returns
 */
const LayoutCategoryIndex = props => {
  const { categoryOptions, categoryPreviewPosts, allPages } = props
  const { locale } = useGlobal()
  const safeCategoryOptions = Array.isArray(categoryOptions)
    ? categoryOptions.filter(category => category?.name)
    : []
  const safePreviewPosts = Array.isArray(categoryPreviewPosts)
    ? categoryPreviewPosts
    : Array.isArray(allPages)
      ? allPages
      : []

  return (
    <div id='category-outer-wrapper' className='mt-8 px-5 md:px-0'>
      {/* 分类页面头部 - 使用蓝色/紫色主题 */}
      <div className='mb-8 p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white'>
        <div className='flex items-center gap-3'>
          <i className='fas fa-folder-open text-3xl'></i>
          <div>
            <h1 className='text-3xl font-bold'>{locale.COMMON.CATEGORY}</h1>
            <p className='text-blue-100 mt-1'>
              共 {safeCategoryOptions.length} 个分类
            </p>
          </div>
        </div>
      </div>

      {/* 分类统计卡片 */}
      <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8'>
        {safeCategoryOptions.map(category => (
          <SmartLink
            key={category.name}
            href={`/category/${encodeURIComponent(category.name)}`}
            className='p-4 bg-white dark:bg-[#1e1e1e] rounded-xl border dark:border-gray-700 hover:border-blue-500 dark:hover:border-purple-500 hover:shadow-lg transition-all duration-300 group'>
            <div className='flex flex-col items-center text-center'>
              <div className='w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform'>
                <i className='fas fa-folder text-blue-500 dark:text-blue-400'></i>
              </div>
              <span className='font-medium text-gray-800 dark:text-gray-200 text-sm truncate w-full'>
                {category.name}
              </span>
              <span className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                {getFiniteNumber(category?.count, 0)} 篇文章
              </span>
            </div>
          </SmartLink>
        ))}
      </div>

      {/* 分类文章列表 */}
      <div id='category-list' className='space-y-10'>
        {safeCategoryOptions.map(category => {
          const posts = safePreviewPosts
            .filter(
              p => p?.category === category.name && p?.status === 'Published'
            )
            .slice(0, 4) // 每个分类显示4篇文章

          if (!posts || posts.length === 0) return null

          return (
            <div
              key={category.name}
              className='bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-700'>
              {/* 分类标题 */}
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center'>
                    <i className='fas fa-folder text-white'></i>
                  </div>
                  <div>
                    <h2 className='text-xl font-bold dark:text-white'>
                      {category.name}
                    </h2>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      {getFiniteNumber(category?.count, 0)} 篇文章
                    </span>
                  </div>
                </div>
                <SmartLink
                  href={`/category/${encodeURIComponent(category.name)}`}
                  className='px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium text-sm flex items-center gap-2'>
                  查看全部 <i className='fas fa-arrow-right text-xs' />
                </SmartLink>
              </div>

              {/* 文章卡片 - 横向大图布局 */}
              <div className='space-y-4'>
                {posts?.map((post, index) => (
                  <CategoryPostCard
                    key={post?.id || post?.slug || index}
                    post={post}
                    index={index}
                    siteInfo={props.siteInfo}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 分类页文章卡片 - 横向大图布局，标题完整显示
 */
const CategoryPostCard = ({ post, index, siteInfo }) => {
  if (!post) return null

  const showCover = post?.pageCoverThumbnail || siteInfo?.pageCover
  const postHref = getPostHref(post)
  const postTags = Array.isArray(post?.tags)
    ? post.tags.map(tag => getSearchText(tag)).filter(Boolean)
    : []
  const createdDate = formatDate(post?.createdTime)
  const title = getSearchText(post?.title) || '未命名'
  const summary = getSearchText(post?.summary)

  return (
    <SmartLink href={postHref}>
      <article className='flex flex-col md:flex-row gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300 group cursor-pointer'>
        {/* 大封面图 - 使用 object-contain 保证图片完整显示 */}
        {showCover && (
          <div className='w-full md:w-48 h-32 md:h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
            <LazyImage
              priority={index === 0}
              width={240}
              height={144}
              sizes='(min-width: 720px) 12rem, 100vw'
              src={post?.pageCoverThumbnail || siteInfo?.pageCover}
              alt={title}
              className='max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500'
            />
          </div>
        )}
        {/* 文章信息 */}
        <div className='flex-1 flex flex-col justify-between py-1'>
          <div>
            {/* 标题 - 完整显示，不截断 */}
            <h3 className='text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-purple-400 transition-colors leading-relaxed'>
              {title}
            </h3>
            {/* 摘要 */}
            {summary && (
              <p className='text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-2 leading-relaxed'>
                {summary}
              </p>
            )}
          </div>
          {/* 元信息 */}
          <div className='flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-500'>
            {createdDate && (
              <span className='flex items-center gap-1'>
                <i className='fas fa-calendar-alt'></i>
                {createdDate}
              </span>
            )}
            {postTags.length > 0 && (
              <span className='flex items-center gap-1'>
                <i className='fas fa-tags'></i>
                {postTags.slice(0, 3).join(' / ')}
              </span>
            )}
          </div>
        </div>
      </article>
    </SmartLink>
  )
}

/**
 * 标签列表 - 使用绿色/青色主题，与分类页面形成视觉区分
 * @param {*} props
 * @returns
 */
const LayoutTagIndex = props => {
  const { tagOptions, allPages, tagPreviewPostsByTag } = props
  const { locale } = useGlobal()
  const safeTagOptions = Array.isArray(tagOptions)
    ? tagOptions.filter(tag => tag?.name)
    : []
  const safeAllPages = Array.isArray(allPages) ? allPages : []
  const [selectedTag, setSelectedTag] = useState(
    /** @type {string | null} */ (null)
  )
  const getPreviewPostsByTag = tagName => {
    const previewPosts = tagPreviewPostsByTag?.[tagName]
    if (Array.isArray(previewPosts)) return previewPosts.filter(Boolean)

    return (
      safeAllPages.filter(
        p => postHasTag(p, tagName) && p?.status === 'Published'
      ) || []
    )
  }

  // 获取选中标签的文章
  const selectedPosts = selectedTag
    ? getPreviewPostsByTag(selectedTag).slice(0, 8)
    : []
  const tagCounts = safeTagOptions.map(tag => getFiniteNumber(tag?.count, 0))
  const maxTagCount = Math.max(1, ...tagCounts)

  return (
    <div id='tag-outer-wrapper' className='px-5 mt-8 md:px-0'>
      {/* 标签页面头部 - 使用绿色/青色主题 */}
      <div className='mb-8 p-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white'>
        <div className='flex items-center gap-3'>
          <i className='fas fa-tags text-3xl'></i>
          <div>
            <h1 className='text-3xl font-bold'>{locale.COMMON.TAGS}</h1>
            <p className='text-emerald-100 mt-1'>
              共 {safeTagOptions.length} 个标签
            </p>
          </div>
        </div>
      </div>

      {/* 标签云 - 交互式设计 */}
      <div className='bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-700 mb-8'>
        <h2 className='text-lg font-bold dark:text-white mb-4 flex items-center gap-2'>
          <i className='fas fa-cloud text-emerald-500'></i>
          标签云
        </h2>
        <div className='flex flex-wrap gap-2'>
          {safeTagOptions.map(tag => {
            // 根据文章数量计算标签大小
            const count = getFiniteNumber(tag?.count, 0)
            const minSize = 0.8
            const maxSize = 1.4
            const size = minSize + (count / maxTagCount) * (maxSize - minSize)
            const isSelected = selectedTag === tag.name

            return (
              <button
                key={tag.name}
                onClick={() => setSelectedTag(isSelected ? null : tag.name)}
                style={{ fontSize: `${size}rem` }}
                className={`px-3 py-1.5 rounded-full transition-all duration-300 ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400'
                }`}>
                #{tag.name}
                <sup className='ml-1 text-xs opacity-70'>{count}</sup>
              </button>
            )
          })}
        </div>
      </div>

      {/* 选中标签的文章预览 */}
      {selectedTag && selectedPosts.length > 0 && (
        <div className='bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-700 mb-8 animate-fade-in'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-bold dark:text-white flex items-center gap-2'>
              <span className='px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full text-sm'>
                #{selectedTag}
              </span>
              的相关文章
            </h2>
            <SmartLink
              href={'/tag/' + encodeURIComponent(selectedTag)}
              className='px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors font-medium text-sm flex items-center gap-2'>
              查看全部 <i className='fas fa-arrow-right text-xs' />
            </SmartLink>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {selectedPosts.map((post, index) => (
              <TagPostCard
                key={post?.id || post?.slug || index}
                post={post}
                index={index}
                siteInfo={props.siteInfo}
              />
            ))}
          </div>
        </div>
      )}

      {/* 按标签分组的文章列表 */}
      <div id='tag-list' className='space-y-8'>
        {safeTagOptions.slice(0, 10).map(tag => {
          const posts = getPreviewPostsByTag(tag.name).slice(0, 3)

          if (!posts || posts.length === 0) return null

          return (
            <div
              key={tag.name}
              className='bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-700'>
              {/* 标签标题 */}
              <div className='flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center'>
                    <i className='fas fa-hashtag text-white'></i>
                  </div>
                  <div>
                    <h2 className='text-xl font-bold dark:text-white'>
                      #{tag.name}
                    </h2>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      {getFiniteNumber(tag?.count, 0)} 篇文章
                    </span>
                  </div>
                </div>
                <SmartLink
                  href={`/tag/${encodeURIComponent(tag.name)}`}
                  className='px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors font-medium text-sm flex items-center gap-2'>
                  查看全部 <i className='fas fa-arrow-right text-xs' />
                </SmartLink>
              </div>

              {/* 文章卡片 - 网格大图布局 */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {posts?.map((post, index) => (
                  <TagPostCard
                    key={post?.id || post?.slug || index}
                    post={post}
                    index={index}
                    siteInfo={props.siteInfo}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 标签页文章卡片 - 垂直大图布局，标题完整显示
 */
const TagPostCard = ({ post, index, siteInfo }) => {
  if (!post) return null

  const showCover = post?.pageCoverThumbnail || siteInfo?.pageCover
  const postHref = getPostHref(post)
  const createdDate = formatDate(post?.createdTime)
  const title = getSearchText(post?.title) || '未命名'
  const summary = getSearchText(post?.summary)
  const category = getSearchText(post?.category)

  return (
    <SmartLink href={postHref}>
      <article className='group cursor-pointer rounded-xl overflow-hidden border dark:border-gray-700 hover:shadow-lg hover:border-emerald-500 dark:hover:border-teal-500 transition-all duration-300'>
        {/* 大封面图 - 使用 object-contain 保证图片完整显示 */}
        {showCover && (
          <div className='w-full h-40 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
            <LazyImage
              priority={index === 0}
              width={360}
              height={160}
              sizes='(min-width: 720px) 33vw, 100vw'
              src={post?.pageCoverThumbnail || siteInfo?.pageCover}
              alt={title}
              className='max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500'
            />
          </div>
        )}
        {/* 文章信息 */}
        <div className='p-4'>
          {/* 标题 - 完整显示 */}
          <h3 className='font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-teal-400 transition-colors leading-relaxed'>
            {title}
          </h3>
          {/* 摘要 */}
          {summary && (
            <p className='text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-2'>
              {summary}
            </p>
          )}
          {/* 元信息 */}
          <div className='flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-500'>
            {createdDate && (
              <span className='flex items-center gap-1'>
                <i className='fas fa-calendar-alt'></i>
                {createdDate}
              </span>
            )}
            {category && (
              <span className='flex items-center gap-1'>
                <i className='fas fa-folder'></i>
                {category}
              </span>
            )}
          </div>
        </div>
      </article>
    </SmartLink>
  )
}

export {
  Layout404,
  LayoutArchive,
  LayoutBase,
  LayoutCategoryIndex,
  LayoutIndex,
  LayoutPostList,
  LayoutSearch,
  LayoutSlug,
  LayoutTagIndex,
  CONFIG as THEME_CONFIG
}
