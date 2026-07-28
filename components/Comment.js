import Tabs from '@/components/Tabs'
import { siteConfig } from '@/lib/config'
import { isBrowser, isSearchEngineBot } from '@/lib/utils'
import { stripTransientQueryParamsFromAsPath } from '@/lib/utils/stripTransientUrlParams'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import Artalk from './Artalk'

/**
 * 评论组件
 *
 * 加载策略（两条路径，任一满足即挂载评论）：
 * 1. 预热路径：文章内容与图片加载完成后（window load），在浏览器空闲时
 *    （requestIdleCallback，4s 超时兜底）挂载。让用户滚到评论区时几乎秒出，
 *    不必再等待评论 JS 与第三方资源（如 Waline emoji bundle）下载。
 * 2. 滚动路径：用户接近评论区（500px rootMargin）时挂载，作为 load 前的兜底
 *    ——如果用户在页面 load 完成前就快速滚到底部，也不会干等。
 * 此外深链直达（?target=comment / ?giscus）仍立即挂载。
 * @param {*} param0
 * @returns
 */
const Comment = ({ frontMatter, className }) => {
  const router = useRouter()
  const articleId = frontMatter?.id
  const [loadedCommentId, setLoadedCommentId] = useState(null)
  const shouldLoad = Boolean(articleId && loadedCommentId === articleId)
  const commentRef = useRef(null)

  const COMMENT_ARTALK_SERVER = siteConfig('COMMENT_ARTALK_SERVER')
  const COMMENT_TWIKOO_ENV_ID = siteConfig('COMMENT_TWIKOO_ENV_ID')
  const COMMENT_WALINE_SERVER_URL = siteConfig('COMMENT_WALINE_SERVER_URL')
  const COMMENT_VALINE_APP_ID = siteConfig('COMMENT_VALINE_APP_ID')
  const COMMENT_GISCUS_REPO = siteConfig('COMMENT_GISCUS_REPO')
  const COMMENT_CUSDIS_APP_ID = siteConfig('COMMENT_CUSDIS_APP_ID')
  const COMMENT_UTTERRANCES_REPO = siteConfig('COMMENT_UTTERRANCES_REPO')
  const COMMENT_GITALK_CLIENT_ID = siteConfig('COMMENT_GITALK_CLIENT_ID')
  const COMMENT_WEBMENTION_ENABLE = siteConfig('COMMENT_WEBMENTION_ENABLE')
  const COMMENT_NOTION_ENABLE =
    siteConfig('COMMENT_NOTION_ENABLE') === true ||
    siteConfig('COMMENT_NOTION_ENABLE') === 'true'

  useEffect(() => {
    // 滚动接近即加载：作为 load 完成前的兜底路径
    const target = commentRef.current
    if (typeof IntersectionObserver !== 'function') {
      setLoadedCommentId(articleId)
      return undefined
    }

    // Only initialize the comment provider when the reader approaches it.
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setLoadedCommentId(articleId)
            observer.unobserve(entry.target)
          }
        })
      },
      // 提前 500px 触发，用户接近评论区之前就开始加载
      { rootMargin: '500px' }
    )

    if (target) {
      observer.observe(target)
    }

    return () => {
      observer.disconnect()
    }
  }, [articleId])

  // 空闲预热路径：文章内容与图片加载完成后，浏览器空闲时挂载评论。
  // 用户滚到评论区时评论资源多已就绪，几乎秒出。
  useEffect(() => {
    if (!isBrowser || !articleId) return undefined

    let cancelled = false
    const mount = () => {
      if (cancelled) return
      setLoadedCommentId(current =>
        current === articleId ? current : articleId
      )
    }

    // 等到 window load（文章正文、首屏及懒加载图片均完成）后，
    // 再在空闲时段挂载，绝不抢占首屏带宽与主线程
    const scheduleIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(mount, { timeout: 4000 })
      } else {
        window.setTimeout(mount, 1500)
      }
    }

    if (document.readyState === 'complete') {
      scheduleIdle()
    } else {
      window.addEventListener('load', scheduleIdle, { once: true })
    }

    return () => {
      cancelled = true
      window.removeEventListener('load', scheduleIdle)
    }
  }, [articleId])

  useEffect(() => {
    if (!isBrowser || !router.isReady) {
      return
    }
    const hasGiscus = 'giscus' in router.query
    const scrollComment = router.query.target === 'comment'
    if (!hasGiscus && !scrollComment) {
      return
    }
    if (scrollComment && !hasGiscus) {
      const cleanPath = stripTransientQueryParamsFromAsPath(router.asPath)
      window.history.replaceState(window.history.state, '', cleanPath)
      router
        .replace(cleanPath, undefined, { scroll: false, shallow: true })
        .catch(() => {})
    }
    if (scrollComment || hasGiscus) {
      // 深链直达评论区时立即挂载，不等待空闲预加载
      setLoadedCommentId(articleId)
      const t = window.setTimeout(() => {
        document
          ?.getElementById('comment')
          ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }, 400)
      return () => window.clearTimeout(t)
    }
  }, [router.isReady, router.asPath, router.query, articleId])

  if (!frontMatter) {
    return null
  }

  if (isSearchEngineBot) {
    return null
  }

  // 特定文章关闭评论区
  if (frontMatter?.comment === 'Hide') {
    return null
  }

  return (
    <div
      key={frontMatter?.id}
      id='comment'
      ref={commentRef}
      className={`comment mt-5 text-gray-800 dark:text-gray-300 ${className || ''}`}>
      {/* 延迟加载评论区 */}
      {!shouldLoad && (
        <div className='text-center'>
          Loading...
          <i className='fas fa-spinner animate-spin text-3xl ' />
        </div>
      )}

      {shouldLoad && (
        <Tabs>
          {COMMENT_ARTALK_SERVER && (
            <div key='Artalk'>
              <Artalk />
            </div>
          )}

          {COMMENT_TWIKOO_ENV_ID && (
            <div key='Twikoo'>
              <TwikooCompenent />
            </div>
          )}

          {COMMENT_WALINE_SERVER_URL && (
            <div key='Waline'>
              <WalineComponent />
            </div>
          )}

          {COMMENT_VALINE_APP_ID && (
            <div key='Valine' name='reply'>
              <ValineComponent path={frontMatter.id} />
            </div>
          )}

          {COMMENT_GISCUS_REPO && (
            <div key='Giscus'>
              <GiscusComponent className='px-2' />
            </div>
          )}

          {COMMENT_CUSDIS_APP_ID && (
            <div key='Cusdis'>
              <CusdisComponent frontMatter={frontMatter} />
            </div>
          )}

          {COMMENT_UTTERRANCES_REPO && (
            <div key='Utterance'>
              <UtterancesComponent
                issueTerm={frontMatter.id}
                className='px-2'
              />
            </div>
          )}

          {COMMENT_GITALK_CLIENT_ID && (
            <div key='GitTalk'>
              <GitalkComponent frontMatter={frontMatter} />
            </div>
          )}

          {COMMENT_WEBMENTION_ENABLE && (
            <div key='WebMention'>
              <WebMentionComponent frontMatter={frontMatter} className='px-2' />
            </div>
          )}

          {COMMENT_NOTION_ENABLE && (
            <div key='Notion'>
              <NotionCommentsComponent postId={frontMatter.id} />
            </div>
          )}
        </Tabs>
      )}
    </div>
  )
}

const WalineComponent = dynamic(
  () => {
    return import('@/components/WalineComponent')
  },
  { ssr: false }
)

const CusdisComponent = dynamic(
  () => {
    return import('@/components/CusdisComponent')
  },
  { ssr: false }
)

const TwikooCompenent = dynamic(
  () => {
    return import('@/components/Twikoo')
  },
  { ssr: false }
)

const GitalkComponent = dynamic(
  () => {
    return import('@/components/Gitalk')
  },
  { ssr: false }
)
const UtterancesComponent = dynamic(
  () => {
    return import('@/components/Utterances')
  },
  { ssr: false }
)
const GiscusComponent = dynamic(
  () => {
    return import('@/components/Giscus')
  },
  { ssr: false }
)
const WebMentionComponent = dynamic(
  () => {
    return import('@/components/WebMention')
  },
  { ssr: false }
)

const ValineComponent = dynamic(() => import('@/components/ValineComponent'), {
  ssr: false
})

const NotionCommentsComponent = dynamic(
  () => import('@/components/NotionComments'),
  { ssr: false }
)

export default Comment
