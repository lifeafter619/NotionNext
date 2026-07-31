import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { loadExternalResource } from '@/lib/utils'
import { useEffect, useMemo, useRef } from 'react'

/**
 * 获取博客的评论数，用与在列表中展示
 * @returns {JSX.Element}
 * @constructor
 */

const TwikooCommentCounter = props => {
  const commentsData = useRef([])
  const { theme } = useGlobal()
  const { posts, archivePosts } = props
  const commentPosts = useMemo(
    () => getCommentCounterPosts({ posts, archivePosts }),
    [posts, archivePosts]
  )
  const twikooCDNURL = siteConfig('COMMENT_TWIKOO_CDN_URL')
  const twikooENVID = siteConfig('COMMENT_TWIKOO_ENV_ID')

  useEffect(() => {
    if (commentPosts.length === 0) return
    let cancelled = false

    const fetchTwikooData = async () => {
      const urls = commentPosts.map(post =>
        post.slug.startsWith('/') ? post.slug : `/${post.slug}`
      )
      try {
        await loadExternalResource(twikooCDNURL, 'js')
        const result = await window.twikoo.getCommentsCount({
          envId: twikooENVID,
          urls,
          includeReply: true
        })
        if (cancelled) return
        commentsData.current = result
        updateCommentCount(commentPosts, result)
      } catch (error) {
        console.error('twikoo 加载失败', error)
      }
    }

    fetchTwikooData()
    return () => {
      cancelled = true
    }
  }, [commentPosts, twikooCDNURL, twikooENVID])

  // 监控主题变化时的的评论数
  useEffect(() => {
    updateCommentCount(commentPosts, commentsData.current)
  }, [theme, commentPosts])

  return null
}

function updateCommentCount(commentPosts, commentsData) {
  if (commentsData.length === 0) return

  commentPosts.forEach(post => {
    const slug = post.slug.startsWith('/') ? post.slug : `/${post.slug}`
    const matchingRes = commentsData.find(result => result.url === slug)
    if (!matchingRes) return

    document
      .querySelectorAll(`.comment-count-text-${post.id}`)
      .forEach(element => {
        element.textContent = String(matchingRes.count)
      })
    document
      .querySelectorAll(`.comment-count-wrapper-${post.id}`)
      .forEach(element => element.classList.remove('hidden'))
  })
}

export function getCommentCounterPosts(props = {}) {
  if (Array.isArray(props.posts)) return props.posts
  if (!props.archivePosts || typeof props.archivePosts !== 'object') return []

  return Object.values(props.archivePosts).flat().filter(Boolean)
}

export default TwikooCommentCounter
