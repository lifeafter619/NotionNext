import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { getListByPage } from '@/lib/utils'
import { adjustImgSize, buildResponsiveSrcSet } from '@/components/LazyImage'
import { enqueueImagePrefetch } from '@/lib/utils/imagePrefetchQueue'
import { useCallback, useEffect, useRef, useState } from 'react'
import CONFIG from '../config'
import BlogPostCard, { getPostCardCoverPreset } from './BlogPostCard'
import BlogPostListEmpty from './BlogPostListEmpty'

/**
 * 博客列表滚动分页
 * 优化：使用节流减少滚动事件触发频率，使用 requestAnimationFrame 优化性能
 * @param posts 所有文章
 * @param tags 所有标签
 * @returns {JSX.Element}
 * @constructor
 */
const BlogPostListScroll = ({
  posts = [],
  currentSearch,
  showSummary = siteConfig('HEO_POST_LIST_SUMMARY', null, CONFIG),
  siteInfo
}) => {
  const { locale, NOTION_CONFIG } = useGlobal()
  const [page, updatePage] = useState(1)
  const POSTS_PER_PAGE = siteConfig('POSTS_PER_PAGE', 12, NOTION_CONFIG)
  const safePosts = Array.isArray(posts) ? posts.filter(Boolean) : []
  const postsToShow = getListByPage(safePosts, page, POSTS_PER_PAGE)
  const targetRef = useRef(null)
  // 使用 useRef 而非 useState 以避免加载状态变化时触发不必要的重渲染
  // 此状态仅用于防止滚动事件触发重复加载
  const isLoadingRef = useRef(false)
  const rafRef = useRef(null) // 用于存储 requestAnimationFrame ID

  useEffect(() => {
    updatePage(1)
  }, [posts])

  let hasMore = false
  if (safePosts.length > 0) {
    const totalCount = safePosts.length
    hasMore = page * POSTS_PER_PAGE < totalCount
  }

  const handleGetMore = useCallback(() => {
    if (!hasMore || isLoadingRef.current) return
    isLoadingRef.current = true
    updatePage(prev => prev + 1)
    // 短暂延迟后重置加载状态
    setTimeout(() => {
      isLoadingRef.current = false
    }, 100)
  }, [hasMore])

  // 优化的滚动处理函数 - 使用 requestAnimationFrame 减少重排
  const scrollTrigger = useCallback(() => {
    // 取消之前的 rAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!targetRef.current) return

      const rect = targetRef.current.getBoundingClientRect()
      const triggerPoint = window.innerHeight + 200 // 提前 200px 触发加载

      if (rect.bottom <= triggerPoint) {
        handleGetMore()
      }
    })
  }, [handleGetMore])

  // 监听滚动 - 使用 passive 事件监听器提高性能
  useEffect(() => {
    if (!hasMore) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    window.addEventListener('scroll', scrollTrigger, { passive: true })
    return () => {
      window.removeEventListener('scroll', scrollTrigger)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [hasMore, scrollTrigger])

  const POST_TWO_COLS = siteConfig('HEO_HOME_POST_TWO_COLS', true, CONFIG)

  // 预热尚未渲染的后续分页封面：当前页图片就绪后，空闲预取队列以受限并发
  // 把下一页（点击“加载更多”或滚动触发后才会渲染）的封面提前拉进 HTTP 缓存，
  // 分页展开时封面直接显示，无需再等网络。预设与卡片渲染共用，
  // 保证预热 URL 与真实渲染时选中的候选一致。
  const IMAGE_COMPRESS_WIDTH = siteConfig('IMAGE_COMPRESS_WIDTH')
  useEffect(() => {
    const allPosts = Array.isArray(posts) ? posts.filter(Boolean) : []
    const upcomingPosts = allPosts.slice(page * POSTS_PER_PAGE)
    if (upcomingPosts.length === 0) return undefined

    const coverPreset = getPostCardCoverPreset(POST_TWO_COLS)
    const targetWidth = Math.min(
      coverPreset.width,
      Number(IMAGE_COMPRESS_WIDTH) || coverPreset.width
    )
    const cancels = upcomingPosts
      .map(post => {
        const cover = post?.pageCoverThumbnail
        if (!cover || String(cover).startsWith('data:')) return null
        const src = adjustImgSize(cover, targetWidth) || cover
        return enqueueImagePrefetch({
          src,
          srcSet: buildResponsiveSrcSet(src, IMAGE_COMPRESS_WIDTH),
          sizes: coverPreset.sizes,
          referrerPolicy: 'no-referrer'
        })
      })
      .filter(Boolean)

    return () => {
      cancels.forEach(cancel => cancel())
    }
  }, [posts, page, POSTS_PER_PAGE, POST_TWO_COLS, IMAGE_COMPRESS_WIDTH])

  if (!postsToShow || postsToShow.length === 0) {
    return <BlogPostListEmpty currentSearch={currentSearch} />
  } else {
    return (
      <div id='container' ref={targetRef} className='w-full'>
        {/* 文章列表 */}
        <div
          className={`${POST_TWO_COLS && '2xl:grid 2xl:grid-cols-2'} grid-cols-1 gap-5`}>
          {' '}
          {postsToShow.map((post, index) => (
            <BlogPostCard
              key={post?.id || post?.slug || index}
              index={index}
              post={post}
              showSummary={showSummary}
              siteInfo={siteInfo}
            />
          ))}
        </div>

        {/* 更多按钮 */}
        <div>
          <button
            type='button'
            disabled={!hasMore}
            onClick={handleGetMore}
            className={`w-full my-4 py-4 text-center rounded-xl dark:text-gray-200 ${hasMore ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : 'cursor-default opacity-70'}`}>
            {' '}
            {hasMore ? locale.COMMON.MORE : `${locale.COMMON.NO_MORE}`}{' '}
          </button>
        </div>
      </div>
    )
  }
}

export default BlogPostListScroll
