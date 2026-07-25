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
 * 只有当前组件在浏览器可见范围内才会加载内容
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
    const target = commentRef.current
    // Check if the component is visible in the viewport
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

    // 预加载：等待页面 load 完成且浏览器空闲后再挂载评论区，
    // 避免评论资源（脚本、表情包、头像）与首屏内容和文章图片抢带宽
    let idleId = null
    let timerId = null
    const preload = () => setLoadedCommentId(articleId)
    const scheduleIdlePreload = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(preload, { timeout: 5000 })
      } else {
        timerId = setTimeout(preload, 2000)
      }
    }
    const onWindowLoad = () => scheduleIdlePreload()
    if (document.readyState === 'complete') {
      scheduleIdlePreload()
    } else {
      window.addEventListener('load', onWindowLoad, { once: true })
    }

    return () => {
      window.removeEventListener('load', onWindowLoad)
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timerId !== null) {
        clearTimeout(timerId)
      }
      observer.disconnect()
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
      className={`comment mt-5 text-gray-800 dark:text-gray-300 ${className || ''}`}
    >
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
