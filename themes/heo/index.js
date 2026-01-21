/**
 *   HEO 主题说明
 *  > 主题设计者 [张洪](https://zhheo.com/)
 *  > 主题开发者 [tangly1024](https://github.com/tangly1024)
 *  1. 开启方式 在blog.config.js 将主题配置为 `HEO`
 *  2. 更多说明参考此[文档](https://docs.tangly1024.com/article/notionnext-heo)
 */

import { AdSlot } from '@/components/GoogleAdsense'
import { HashTag } from '@/components/HeroIcons'
import LazyImage from '@/components/LazyImage'
import LoadingCover from '@/components/LoadingCover'
import replaceSearchResult from '@/components/Mark'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { loadWowJS } from '@/lib/plugins/wow'
import { isBrowser } from '@/lib/utils'
import algoliasearch from 'algoliasearch'
import { Transition } from '@headlessui/react'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import BlogPostArchive from './components/BlogPostArchive'
import BlogPostListPage from './components/BlogPostListPage'
import BlogPostListScroll from './components/BlogPostListScroll'
import BlogPostCard from './components/BlogPostCard'
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
import SideRight from './components/SideRight'
import CONFIG from './config'
import { Style } from './style'
import ArticleExpirationNotice from '@/components/ArticleExpirationNotice'

const Comment = dynamic(() => import('@/components/Comment'), { ssr: false })
const ShareBar = dynamic(() => import('@/components/ShareBar'), { ssr: false })
const NotionPage = dynamic(() => import('@/components/NotionPage'), { ssr: true })
const PostAdjacent = dynamic(() => import('./components/PostAdjacent'), { ssr: false })
const PostCopyright = dynamic(() => import('./components/PostCopyright'), { ssr: false })
const PostRecommend = dynamic(() => import('./components/PostRecommend'), { ssr: false })
const AISummary = dynamic(() => import('@/components/AISummary'), { ssr: false })
const WWAds = dynamic(() => import('@/components/WWAds'), { ssr: false })

/**
 * 基础布局 采用上中下布局，移动端使用顶部侧边导航栏
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
const LayoutBase = props => {
  const { children, slotTop, className } = props

  // 全屏模式下的最大宽度
  const { fullWidth, isDarkMode } = useGlobal()
  const router = useRouter()

  const headerSlot = (
    <header>
      {/* 顶部导航 */}
      <Header {...props} />

      {/* 通知横幅 */}
      {router.route === '/' ? (
        <>
          <NoticeBar />
          <Hero {...props} />
        </>
      ) : null}
      {fullWidth ? null : <PostHeader {...props} isDarkMode={isDarkMode} />}
    </header>
  )

  // 右侧栏 用户信息+标签列表
  const slotRight =
    router.route === '/404' || fullWidth ? null : <SideRight {...props} />

  const maxWidth = fullWidth ? 'max-w-[96rem] mx-auto' : 'max-w-[86rem]' // 普通最大宽度是86rem和顶部菜单栏对齐，留空则与窗口对齐

  const HEO_HERO_BODY_REVERSE = siteConfig(
    'HEO_HERO_BODY_REVERSE',
    false,
    CONFIG
  )
  const HEO_LOADING_COVER = siteConfig('HEO_LOADING_COVER', true, CONFIG)
  const HEO_ANIMATE_ON_SCROLL = siteConfig('HEO_ANIMATE_ON_SCROLL', true, CONFIG)

  // 加载wow动画
  useEffect(() => {
    if (HEO_ANIMATE_ON_SCROLL) {
      loadWowJS()
    }
  }, [HEO_ANIMATE_ON_SCROLL])

  return (
    <div
      id='theme-heo'
      className={`${siteConfig('FONT_STYLE')} bg-[#f7f9fe] dark:bg-[#18171d] h-full min-h-screen flex flex-col scroll-smooth`}>
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
          <div className={`w-full h-auto ${className || ''}`}>
            {/* 主区上部嵌入 */}
            {slotTop}
            {children}
          </div>

          <div className='lg:px-2'></div>

          <div className='hidden 2xl:block h-full'>
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
const LayoutSearch = props => {
  const { keyword, posts, postCount } = props
  const router = useRouter()
  const currentSearch = keyword || router?.query?.s
  const { locale } = useGlobal()
  const [sortOrder, setSortOrder] = useState('relevance')
  const [viewMode, setViewMode] = useState('list') // list or grid
  const [algoliaResults, setAlgoliaResults] = useState(null)
  const [loading, setLoading] = useState(false)

  // 检查是否开启 Algolia
  const enableAlgolia = siteConfig('ALGOLIA_APP_ID') && siteConfig('ALGOLIA_SEARCH_ONLY_APP_KEY') && siteConfig('ALGOLIA_INDEX')

  useEffect(() => {
    if (enableAlgolia && currentSearch) {
      setLoading(true)
      const client = algoliasearch(siteConfig('ALGOLIA_APP_ID'), siteConfig('ALGOLIA_SEARCH_ONLY_APP_KEY'))
      const index = client.initIndex(siteConfig('ALGOLIA_INDEX'))
      index.search(currentSearch, {
        attributesToSnippet: ['content:150', 'summary:100'],
        highlightPreTag: '<span class="text-red-500 font-bold">',
        highlightPostTag: '</span>'
      }).then(({ hits }) => {
        // 去重逻辑：使用 slug 作为唯一标识
        const uniqueHitsMap = new Map()
        hits.forEach(hit => {
            if (!uniqueHitsMap.has(hit.slug)) {
                uniqueHitsMap.set(hit.slug, hit)
            }
        })
        const uniqueHits = Array.from(uniqueHitsMap.values())

        const mappedHits = uniqueHits.map(hit => ({
          ...hit,
          id: hit.objectID,
          title: hit._highlightResult?.title?.value || hit.title,
          summary: hit._snippetResult?.content?.value || hit.summary,
          // Algolia 返回的 content 是截断的，但我们这里主要展示 snippet
          // 为了兼容 SearchResultCard 的 href 构建
          slug: hit.slug,
          href: hit.slug?.startsWith('http') ? hit.slug : `${siteConfig('SUB_PATH', '')}/${hit.slug}`,
          createdTime: hit.createdTime || hit.createdTimestamp
        }))
        setAlgoliaResults(mappedHits)
        setLoading(false)
      }).catch(err => {
        console.error('Algolia search failed:', err)
        setAlgoliaResults(null)
        setLoading(false)
      })
    } else {
      setAlgoliaResults(null)
    }
  }, [currentSearch, enableAlgolia])

  // 优先使用 Algolia 结果，否则使用本地结果
  const displayPosts = (algoliaResults || posts || []).filter(post => post.slug || post.objectID)

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
    if (currentSearch && !enableAlgolia) {
      setTimeout(() => {
        replaceSearchResult({
          doms: document.getElementsByClassName('replace'),
          search: currentSearch,
          target: {
            element: 'span',
            className: 'text-red-500 border-b border-dashed'
          }
        })
      }, 100)
    }
  }, [currentSearch, enableAlgolia])

  return (
    <div id='search-page-wrapper' className='px-5 md:px-0'>
      <SearchNav {...props} />
      <div className='mt-6'>
        {currentSearch && (
          <div className='bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-700 mb-6'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <div>
                <h1 className='text-2xl font-bold dark:text-white flex items-center gap-2'>
                  <i className='fas fa-search text-blue-500'></i>
                  搜索结果
                </h1>
                <p className='text-gray-600 dark:text-gray-400 mt-1'>
                  找到 <span className='font-bold text-blue-600 dark:text-yellow-500'>{sortedPosts.length}</span> 篇关于
                  <span className='font-bold mx-1'>{'"'}{currentSearch}{'"'}</span> 的文章
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
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-yellow-500 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}>
                    <i className='fas fa-star mr-1'></i>相关
                  </button>
                  <button
                    onClick={() => setSortOrder('newest')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      sortOrder === 'newest'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-yellow-500 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}>
                    <i className='fas fa-clock mr-1'></i>最新
                  </button>
                  <button
                    onClick={() => setSortOrder('oldest')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      sortOrder === 'oldest'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-yellow-500 shadow'
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
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-yellow-500 shadow'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                    <i className='fas fa-list'></i>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-yellow-500 shadow'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                    <i className='fas fa-th-large'></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 搜索结果列表 - 只有当 loading 为真或有搜索结果，或无结果时才显示内容 */}
        {(loading || (sortedPosts.length > 0) || (currentSearch && sortedPosts.length === 0)) && (
          <div id='posts-wrapper'>
            {loading ? (
                <div className="flex justify-center py-20">
                    <i className="fas fa-spinner animate-spin text-4xl text-blue-500"></i>
                </div>
            ) : sortedPosts.length > 0 ? (
              viewMode === 'list' ? (
                <div className='space-y-4'>
                  {sortedPosts.map((post, index) => (
                    <SearchResultCard key={post.id} post={post} index={index} currentSearch={currentSearch} siteInfo={props.siteInfo} isAlgolia={!!enableAlgolia} />
                  ))}
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {sortedPosts.map((post, index) => (
                    <SearchResultGridCard key={post.id} post={post} index={index} currentSearch={currentSearch} siteInfo={props.siteInfo} isAlgolia={!!enableAlgolia} />
                  ))}
                </div>
              )
            ) : (
              <div className='text-center py-16 bg-white dark:bg-[#1e1e1e] rounded-2xl'>
                <i className='fas fa-search text-6xl text-gray-300 dark:text-gray-600 mb-4'></i>
                <p className='text-xl text-gray-600 dark:text-gray-400'>未找到相关文章</p>
                <p className='text-gray-500 dark:text-gray-500 mt-2'>尝试使用不同的关键词搜索</p>
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
const SearchResultCard = ({ post, index, currentSearch, siteInfo, isAlgolia = false }) => {
  const showCover = post?.pageCoverThumbnail || siteInfo?.pageCover

  let displayContent = post.summary
  let displayTitle = post.title
  let showJumpButton = false
  let matchLocation = '' // 显示匹配位置的提示

  if (isAlgolia) {
    // Algolia 模式下，content 和 title 已经是带 HTML 的 snippets
    // 使用 dangerouslySetInnerHTML 渲染
    displayContent = <span dangerouslySetInnerHTML={{ __html: post.summary }} />
    displayTitle = <span dangerouslySetInnerHTML={{ __html: post.title }} />
    showJumpButton = true
    matchLocation = '文章内容'
  } else {
    // 本地搜索逻辑 - 检查关键词在哪里匹配
    const keyword = currentSearch?.toLowerCase() || ''
    if (keyword) {
      const titleMatch = (post.title || '').toLowerCase().includes(keyword)
      const summaryMatch = (post.summary || '').toLowerCase().includes(keyword)
      const contentMatch = (post.content || '').toLowerCase().includes(keyword)
      
      if (contentMatch) {
        // 如果在内容中匹配，显示内容片段
        const text = post.content || ''
        const indexInText = text.toLowerCase().indexOf(keyword)
        const start = Math.max(0, indexInText - 50)
        const end = Math.min(text.length, indexInText + 150)
        displayContent = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '')
        showJumpButton = true
        matchLocation = '文章内容'
      } else if (summaryMatch) {
        matchLocation = '摘要'
        showJumpButton = true
      } else if (titleMatch) {
        matchLocation = '标题'
        showJumpButton = true
      }
      
      // 检查 results 字段（某些主题可能使用）
      if (post.results && post.results.length > 0) {
        displayContent = post.results.map(r => r).join('...')
        showJumpButton = true
        matchLocation = '文章内容'
      }
    }
  }

  return (
    <SmartLink href={post?.href}>
      <article className='replace bg-white dark:bg-[#1e1e1e] rounded-xl border dark:border-gray-700 p-4 flex gap-4 hover:shadow-lg hover:border-blue-500 dark:hover:border-yellow-500 transition-all duration-300 group cursor-pointer'>
        {/* 封面图 - 使用 object-contain 保证图片完整显示 */}
        {showCover && (
          <div className='w-32 h-24 md:w-40 md:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
            <LazyImage
              priority={index < 3}
              src={post?.pageCoverThumbnail || siteInfo?.pageCover}
              alt={post?.title}
              className='max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500'
            />
          </div>
        )}
        {/* 文章信息 */}
        <div className='flex-1 flex flex-col justify-between min-w-0'>
          <div>
            <h3 className='text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-yellow-500 transition-colors line-clamp-2'>
              {displayTitle}
            </h3>
            {displayContent && (
              <div className='text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-3 bg-gray-50 dark:bg-gray-800 p-2 rounded'>
                {displayContent}
              </div>
            )}
            {showJumpButton && (
               <div className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // 这里 currentSearch 可能是用户输入的词，也可能是 Algolia 匹配到的词，简单起见用输入词
                      // 更好的做法是提取 snippet 中的高亮词，但这里保持逻辑简单
                      window.location.href = `${post.href}?keyword=${encodeURIComponent(currentSearch)}`
                    }}>
                    <i className="fas fa-search-location"></i>
                    <span>跳转到搜索位置</span>
                    {matchLocation && <span className="text-gray-500 dark:text-gray-400">({matchLocation})</span>}
               </div>
            )}
          </div>
          <div className='flex items-center flex-wrap gap-3 mt-2 text-xs text-gray-500'>
            {post.category && (
              <span className='px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded'>
                <i className='fas fa-folder mr-1'></i>{post.category}
              </span>
            )}
            {post.tags && post.tags.slice(0, 2).map(tag => (
              <span key={tag} className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded'>
                #{tag}
              </span>
            ))}
            {post.createdTime && (
              <span><i className='fas fa-calendar mr-1'></i>{new Date(post.createdTime).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </article>
    </SmartLink>
  )
}

/**
 * 搜索结果卡片 - 网格视图
 */
const SearchResultGridCard = ({ post, index, currentSearch, siteInfo, isAlgolia = false }) => {
  const showCover = post?.pageCoverThumbnail || siteInfo?.pageCover

  let displayContent = post.summary
  let displayTitle = post.title
  let showJumpButton = false
  let matchLocation = ''

  if (isAlgolia) {
    displayContent = <span dangerouslySetInnerHTML={{ __html: post.summary }} />
    displayTitle = <span dangerouslySetInnerHTML={{ __html: post.title }} />
    showJumpButton = true
    matchLocation = '文章内容'
  } else {
    const keyword = currentSearch?.toLowerCase() || ''
    if (keyword) {
      const titleMatch = (post.title || '').toLowerCase().includes(keyword)
      const summaryMatch = (post.summary || '').toLowerCase().includes(keyword)
      const contentMatch = (post.content || '').toLowerCase().includes(keyword)
      
      if (contentMatch) {
        const text = post.content || ''
        const indexInText = text.toLowerCase().indexOf(keyword)
        const start = Math.max(0, indexInText - 50)
        const end = Math.min(text.length, indexInText + 150)
        displayContent = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '')
        showJumpButton = true
        matchLocation = '文章内容'
      } else if (summaryMatch) {
        matchLocation = '摘要'
        showJumpButton = true
      } else if (titleMatch) {
        matchLocation = '标题'
        showJumpButton = true
      }
      
      if (post.results && post.results.length > 0) {
        displayContent = post.results.map(r => r).join('...')
        showJumpButton = true
        matchLocation = '文章内容'
      }
    }
  }

  // 将搜索词附加到主链接，实现点击卡片任意位置跳转
  const hrefWithFragment = showJumpButton ? `${post.href}?keyword=${encodeURIComponent(currentSearch)}` : post.href

  return (
    <SmartLink href={hrefWithFragment}>
      <article className='replace bg-white dark:bg-[#1e1e1e] rounded-xl border dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-500 dark:hover:border-yellow-500 transition-all duration-300 group cursor-pointer h-full flex flex-col'>
        {/* 封面图 - 使用 object-contain 保证图片完整显示 */}
        {showCover && (
          <div className='w-full h-40 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
            <LazyImage
              priority={index < 6}
              src={post?.pageCoverThumbnail || siteInfo?.pageCover}
              alt={post?.title}
              className='max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500'
            />
          </div>
        )}
        {/* 文章信息 */}
        <div className='p-4 flex-1 flex flex-col justify-between'>
          <div>
            <h3 className='font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-yellow-500 transition-colors'>
              {displayTitle}
            </h3>
            {displayContent && (
              <div className='text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-3 bg-gray-50 dark:bg-gray-800 p-2 rounded'>
                {displayContent}
              </div>
            )}
            {showJumpButton && (
               <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      window.location.href = `${post.href}?keyword=${encodeURIComponent(currentSearch)}`
                    }}>
                    <i className="fas fa-search-location"></i>
                    <span>跳转到搜索位置</span>
                    {matchLocation && <span className="text-gray-500 dark:text-gray-400">({matchLocation})</span>}
               </div>
            )}
          </div>
          <div className='flex items-center gap-2 mt-3 text-xs text-gray-500'>
            {post.category && (
              <span className='px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded'>
                {post.category}
              </span>
            )}
            {post.createdTime && (
              <span>{new Date(post.createdTime).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </article>
    </SmartLink>
  )
}

/**
 * 归档
 * @param {*} props
 * @returns
 */
const LayoutArchive = props => {
  const { archivePosts } = props

  // 归档页顶部显示条，如果是默认归档则不显示。分类详情页显示分类列表，标签详情页显示当前标签

  return (
    <div className='p-5 rounded-xl border dark:border-gray-600 max-w-6xl w-full bg-white dark:bg-[#1e1e1e]'>
      {/* 文章分类条 */}
      <CategoryBar {...props} border={false} />

      <div className='px-3'>
        {Object.keys(archivePosts).map(archiveTitle => (
          <BlogPostArchive
            key={archiveTitle}
            posts={archivePosts[archiveTitle]}
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
  const [hasCode, setHasCode] = useState(false)
  const [showRecommended, setShowRecommended] = useState(false)

  useEffect(() => {
    const hasCode = document.querySelectorAll('[class^="language-"]').length > 0
    setHasCode(hasCode)
  }, [])

  const commentEnable =
    siteConfig('COMMENT_TWIKOO_ENV_ID') ||
    siteConfig('COMMENT_WALINE_SERVER_URL') ||
    siteConfig('COMMENT_VALINE_APP_ID') ||
    siteConfig('COMMENT_GISCUS_REPO') ||
    siteConfig('COMMENT_CUSDIS_APP_ID') ||
    siteConfig('COMMENT_UTTERRANCES_REPO') ||
    siteConfig('COMMENT_GITALK_CLIENT_ID') ||
    siteConfig('COMMENT_WEBMENTION_ENABLE')

  const router = useRouter()
  const waiting404 = siteConfig('POST_WAITING_TIME_FOR_404') * 1000

  // 检查 URL 是否包含搜索跳转
  useEffect(() => {
    if (isBrowser) {
        const hash = window.location.hash
        if (hash && hash.includes('text=')) {
            // 解析 text= 后的内容 (简单处理，浏览器会自动高亮)
            // const text = decodeURIComponent(hash.split('text=')[1])
            // 这里我们只需要提示用户跳转成功
            const toastElement = document.getElementById('toast-wrapper')
            if (!toastElement) {
                // 如果没有 Toast 容器，这里可以手动触发一个 (theme-heo 通常有全局 Toast，这里复用 logic 或创建临时提示)
                // 由于 Toast 组件通常是命令式调用的，这里我们尝试一个简单的 dom 操作或依赖全局状态
                // 暂时使用 alert 替代验证，或者更好的方式是使用 context
                // 但 themes/heo/index.js 似乎没有直接暴露 toast context
                // 我们直接渲染一个临时的 Toast
                setShowJumpToast(true)
                setTimeout(() => setShowJumpToast(false), 3000)
            }
        }
    }
  }, [])

  const [showJumpToast, setShowJumpToast] = useState(false)

  // 监听滚动，延迟加载底部推荐和评论
  useEffect(() => {
    if (!post) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setShowRecommended(true)
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
  }, [post])

  useEffect(() => {
    // 404
    if (!post) {
      setTimeout(
        () => {
          if (isBrowser) {
            const article = document.querySelector(
              '#article-wrapper #notion-article'
            )
            if (!article) {
              router.push('/404').then(() => {
                console.warn('找不到页面', router.asPath)
              })
            }
          }
        },
        waiting404
      )
    }
  }, [post])

  return (
    <>
      <div
        className={`article h-full w-full ${fullWidth ? '' : 'xl:max-w-5xl'} ${hasCode ? 'xl:w-[73.15vw]' : ''}  bg-white dark:bg-[#18171d] dark:border-gray-600 lg:hover:shadow lg:border rounded-2xl lg:px-2 lg:py-4 `}>
        {/* 文章锁 */}
        {lock && <PostLock validPassword={validPassword} />}

        {!lock && post && (
          <div className='mx-auto md:w-full md:px-5'>
            {/* 文章主体 */}
            <article
              id='article-wrapper'
              itemScope
              itemType='https://schema.org/Movie'>
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
              <div id="article-end-observer" className="h-1" />

              {/* 上一篇\下一篇文章 */}
              <PostAdjacent {...props} />

              {/* 延迟加载底部区域 */}
              {showRecommended && (
                  <div className="animate-fade-in">
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
              <div id='post-comments' className={`${commentEnable && post && showRecommended ? '' : 'hidden'}`}>
                <hr className='my-4 border-dashed' />
                {/* 评论区上方广告 */}
                <div className='py-2'>
                  <AdSlot />
                </div>
                {/* 评论互动 */}
                <div className='duration-200 overflow-x-auto px-5'>
                  <div className='text-2xl dark:text-white'>
                    <i className='fas fa-comment mr-1' />
                    {locale.COMMON.COMMENTS}
                  </div>
                  <Comment frontMatter={post} className='' />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <FloatTocButton {...props} />
      <SearchHighlightNav />

      {/* 搜索跳转提示 */}
      {showJumpToast && (
        <div className="fixed top-20 left-0 right-0 mx-auto z-50 w-fit">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in-down">
                <i className="fas fa-search-location"></i>
                <span>已跳转到搜索内容位置</span>
            </div>
        </div>
      )}
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
                src={
                  'https://bu.dusays.com/2023/03/03/6401a7906aa4a.gif'
                }></LazyImage>

              {/* 右侧文字 */}
              <div className='error-info flex-1 flex flex-col justify-center items-center space-y-4'>
                <h1 className='error-title font-extrabold md:text-9xl text-7xl dark:text-white'>
                  404
                </h1>
                <div className='dark:text-white'>请尝试站内搜索寻找文章</div>
                <SmartLink href='/'>
                  <button className='bg-blue-500 py-2 px-4 text-white shadow rounded-lg hover:bg-blue-600 hover:shadow-md duration-200 transition-all'>
                    回到主页
                  </button>
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
  const { categoryOptions, allPages } = props
  const { locale } = useGlobal()

  return (
    <div id='category-outer-wrapper' className='mt-8 px-5 md:px-0'>
      {/* 分类页面头部 - 使用蓝色/紫色主题 */}
      <div className='mb-8 p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white'>
        <div className='flex items-center gap-3'>
          <i className='fas fa-folder-open text-3xl'></i>
          <div>
            <h1 className='text-3xl font-bold'>{locale.COMMON.CATEGORY}</h1>
            <p className='text-blue-100 mt-1'>共 {categoryOptions?.length || 0} 个分类</p>
          </div>
        </div>
      </div>

      {/* 分类统计卡片 */}
      <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8'>
        {categoryOptions?.map(category => (
          <SmartLink 
            key={category.name}
            href={`/category/${category.name}`}
            className='p-4 bg-white dark:bg-[#1e1e1e] rounded-xl border dark:border-gray-700 hover:border-blue-500 dark:hover:border-purple-500 hover:shadow-lg transition-all duration-300 group'>
            <div className='flex flex-col items-center text-center'>
              <div className='w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform'>
                <i className='fas fa-folder text-blue-500 dark:text-blue-400'></i>
              </div>
              <span className='font-medium text-gray-800 dark:text-gray-200 text-sm truncate w-full'>{category.name}</span>
              <span className='text-xs text-gray-500 dark:text-gray-400 mt-1'>{category.count} 篇文章</span>
            </div>
          </SmartLink>
        ))}
      </div>

      {/* 分类文章列表 */}
      <div id='category-list' className='space-y-10'>
        {categoryOptions?.map(category => {
          const posts = allPages?.filter(
            p => p.category === category.name && p.status === 'Published'
          ).slice(0, 4) // 每个分类显示4篇文章

          if (!posts || posts.length === 0) return null

          return (
            <div key={category.name} className='bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-700'>
              {/* 分类标题 */}
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center'>
                    <i className='fas fa-folder text-white'></i>
                  </div>
                  <div>
                    <h2 className='text-xl font-bold dark:text-white'>{category.name}</h2>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>{category.count} 篇文章</span>
                  </div>
                </div>
                <SmartLink 
                  href={`/category/${category.name}`} 
                  className='px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium text-sm flex items-center gap-2'>
                  查看全部 <i className='fas fa-arrow-right text-xs'/>
                </SmartLink>
              </div>

              {/* 文章卡片 - 横向大图布局 */}
              <div className='space-y-4'>
                {posts?.map((post, index) => (
                  <CategoryPostCard key={post.id} post={post} index={index} siteInfo={props.siteInfo} />
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
  const showCover = post?.pageCoverThumbnail || siteInfo?.pageCover

  return (
    <SmartLink href={post?.href}>
      <article className='flex flex-col md:flex-row gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300 group cursor-pointer'>
        {/* 大封面图 - 使用 object-contain 保证图片完整显示 */}
        {showCover && (
          <div className='w-full md:w-48 h-32 md:h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
            <LazyImage
              priority={index === 0}
              src={post?.pageCoverThumbnail || siteInfo?.pageCover}
              alt={post?.title}
              className='max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500'
            />
          </div>
        )}
        {/* 文章信息 */}
        <div className='flex-1 flex flex-col justify-between py-1'>
          <div>
            {/* 标题 - 完整显示，不截断 */}
            <h3 className='text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-purple-400 transition-colors leading-relaxed'>
              {post.title}
            </h3>
            {/* 摘要 */}
            {post.summary && (
              <p className='text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-2 leading-relaxed'>
                {post.summary}
              </p>
            )}
          </div>
          {/* 元信息 */}
          <div className='flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-500'>
            {post.createdTime && (
              <span className='flex items-center gap-1'>
                <i className='fas fa-calendar-alt'></i>
                {new Date(post.createdTime).toLocaleDateString()}
              </span>
            )}
            {post.tags && post.tags.length > 0 && (
              <span className='flex items-center gap-1'>
                <i className='fas fa-tags'></i>
                {post.tags.slice(0, 3).join(' / ')}
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
  const { tagOptions, allPages } = props
  const { locale } = useGlobal()
  const [selectedTag, setSelectedTag] = useState(null)

  // 获取选中标签的文章
  const selectedPosts = selectedTag 
    ? allPages?.filter(p => p.tags && p.tags.includes(selectedTag) && p.status === 'Published').slice(0, 8)
    : []

  return (
    <div id='tag-outer-wrapper' className='px-5 mt-8 md:px-0'>
      {/* 标签页面头部 - 使用绿色/青色主题 */}
      <div className='mb-8 p-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white'>
        <div className='flex items-center gap-3'>
          <i className='fas fa-tags text-3xl'></i>
          <div>
            <h1 className='text-3xl font-bold'>{locale.COMMON.TAGS}</h1>
            <p className='text-emerald-100 mt-1'>共 {tagOptions?.length || 0} 个标签</p>
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
          {tagOptions?.map(tag => {
            // 根据文章数量计算标签大小
            const maxCount = Math.max(...(tagOptions?.map(t => t.count) || [1]))
            const minSize = 0.8
            const maxSize = 1.4
            const size = minSize + ((tag.count / maxCount) * (maxSize - minSize))
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
                <sup className='ml-1 text-xs opacity-70'>{tag.count}</sup>
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
              href={`/tag/${selectedTag}`}
              className='px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors font-medium text-sm flex items-center gap-2'>
              查看全部 <i className='fas fa-arrow-right text-xs'/>
            </SmartLink>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {selectedPosts.map((post, index) => (
              <TagPostCard key={post.id} post={post} index={index} siteInfo={props.siteInfo} />
            ))}
          </div>
        </div>
      )}

      {/* 按标签分组的文章列表 */}
      <div id='tag-list' className='space-y-8'>
        {tagOptions?.slice(0, 10).map(tag => {
          const posts = allPages?.filter(
            p => p.tags && p.tags.includes(tag.name) && p.status === 'Published'
          ).slice(0, 3)

          if (!posts || posts.length === 0) return null

          return (
            <div key={tag.name} className='bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 border dark:border-gray-700'>
              {/* 标签标题 */}
              <div className='flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center'>
                    <i className='fas fa-hashtag text-white'></i>
                  </div>
                  <div>
                    <h2 className='text-xl font-bold dark:text-white'>#{tag.name}</h2>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>{tag.count} 篇文章</span>
                  </div>
                </div>
                <SmartLink 
                  href={`/tag/${tag.name}`} 
                  className='px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors font-medium text-sm flex items-center gap-2'>
                  查看全部 <i className='fas fa-arrow-right text-xs'/>
                </SmartLink>
              </div>

              {/* 文章卡片 - 网格大图布局 */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {posts?.map((post, index) => (
                  <TagPostCard key={post.id} post={post} index={index} siteInfo={props.siteInfo} />
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
  const showCover = post?.pageCoverThumbnail || siteInfo?.pageCover

  return (
    <SmartLink href={post?.href}>
      <article className='group cursor-pointer rounded-xl overflow-hidden border dark:border-gray-700 hover:shadow-lg hover:border-emerald-500 dark:hover:border-teal-500 transition-all duration-300'>
        {/* 大封面图 - 使用 object-contain 保证图片完整显示 */}
        {showCover && (
          <div className='w-full h-40 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
            <LazyImage
              priority={index === 0}
              src={post?.pageCoverThumbnail || siteInfo?.pageCover}
              alt={post?.title}
              className='max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500'
            />
          </div>
        )}
        {/* 文章信息 */}
        <div className='p-4'>
          {/* 标题 - 完整显示 */}
          <h3 className='font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-teal-400 transition-colors leading-relaxed'>
            {post.title}
          </h3>
          {/* 摘要 */}
          {post.summary && (
            <p className='text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-2'>
              {post.summary}
            </p>
          )}
          {/* 元信息 */}
          <div className='flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-500'>
            {post.createdTime && (
              <span className='flex items-center gap-1'>
                <i className='fas fa-calendar-alt'></i>
                {new Date(post.createdTime).toLocaleDateString()}
              </span>
            )}
            {post.category && (
              <span className='flex items-center gap-1'>
                <i className='fas fa-folder'></i>
                {post.category}
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
