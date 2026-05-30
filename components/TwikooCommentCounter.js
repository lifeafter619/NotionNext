import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { loadExternalResource } from '@/lib/utils'
import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'

/**
 * 获取博客的评论数，用与在列表中展示
 * @returns {JSX.Element}
 * @constructor
 */

const TwikooCommentCounter = props => {
  let commentsData = []
  const { theme } = useGlobal()
  const router = useRouter()
  const commentPosts = useMemo(
    () => getCommentCounterPosts(props),
    [props.posts, props.archivePosts]
  )

  useEffect(() => {
    // console.log('路由触发评论计数')
    if (commentPosts.length > 0) {
      fetchTwikooData(commentPosts)
    }
  }, [router.events])

  // 监控主题变化时的的评论数
  useEffect(() => {
    // console.log('主题触发评论计数', commentsData)
    updateCommentCount()
  }, [theme])

  const twikooCDNURL = siteConfig('COMMENT_TWIKOO_CDN_URL')
  const twikooENVID = siteConfig('COMMENT_TWIKOO_ENV_ID')

  /**
   * 加载外部twikoojs
   * @param {*} posts
   */
  const fetchTwikooData = async posts => {
    const urls = posts.map(post =>
      post.slug.startsWith('/') ? post.slug : `/${post.slug}`
    )
    try {
      await loadExternalResource(twikooCDNURL, 'js')
      const twikoo = window.twikoo
      twikoo
        .getCommentsCount({
          envId: twikooENVID, // 环境 ID
          // region: 'ap-guangzhou', // 环境地域，默认为 ap-shanghai，如果您的环境地域不是上海，需传此参数
          urls, // 不包含协议、域名、参数的文章路径列表，必传参数
          includeReply: true // 评论数是否包括回复，默认：false
        })
        .then(function (res) {
          commentsData = res
          updateCommentCount()
        })
        .catch(function (err) {
          // 发生错误
          console.error(err)
        })
    } catch (error) {
      console.error('twikoo 加载失败', error)
    }
  }

  const updateCommentCount = () => {
    if (commentsData.length === 0) {
      return
    }
    commentPosts.forEach(post => {
      const slug = post.slug.startsWith('/') ? post.slug : `/${post.slug}`
      const matchingRes = commentsData.find(r => r.url === slug)
      if (matchingRes) {
        // 修改评论数量div
        const textElements = document.querySelectorAll(
          `.comment-count-text-${post.id}`
        )
        textElements.forEach(element => {
          element.innerHTML = matchingRes.count
        })
        // 取消隐藏
        const wrapperElements = document.querySelectorAll(
          `.comment-count-wrapper-${post.id}`
        )
        wrapperElements.forEach(element => {
          element.classList.remove('hidden')
        })
      }
    })
  }

  return null
}

export function getCommentCounterPosts(props = {}) {
  if (Array.isArray(props.posts)) return props.posts
  if (!props.archivePosts || typeof props.archivePosts !== 'object') return []

  return Object.values(props.archivePosts).flat().filter(Boolean)
}

export default TwikooCommentCounter
