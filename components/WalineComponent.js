import { createRef, useEffect, useState } from 'react'
import { init } from '@waline/client'
import { useRouter } from 'next/router'
import '@waline/client/style'
import { siteConfig } from '@/lib/config'

const path = ''
let waline = null
/**
 * @see https://waline.js.org/guide/get-started.html
 * @param {*} props
 * @returns
 */
const WalineComponent = props => {
  const containerRef = createRef()
  const router = useRouter()
  const [loadError, setLoadError] = useState(false)

  const updateWaline = url => {
    if (url !== path && waline) {
      waline.update(props)
    }
  }
  const locale = {
    nick: '昵称',
    nickError: '昵称不能少于3个字符哦...',
    mail: '邮箱',
    mailError: '请填写正确的邮件地址',
    link: '网址',
    optional: '可选',
    placeholder:
      '来叭叭，信息都不留也行~\n如果留下邮箱的话，被回复时会有📧通知~',
    sofa: '来发评论吧~',
    submit: '提交~',
    like: '喜欢✪ω✪',
    cancelLike: '取消喜欢',
    reply: '回复~',
    cancelReply: '取消回复',
    comment: '评论~',
    refresh: '刷新',
    more: '加载更多...',
    preview: '预览',
    emoji: '表情',
    uploadImage: '上传图片',
    seconds: '秒前',
    minutes: '分钟前',
    hours: '小时前',
    days: '天前',
    now: '刚刚~',
    uploading: '正在上传ing',
    login: '登录',
    logout: '退出',
    admin: '站长＆颜值区超管😎',
    sticky: '置顶📌',
    word: '字',
    wordHint: '评论字数应在 $0 到 $1 字之间！\n当前字数：$2',
    anonymous: '匿名同志',
    gif: '表情包',
    profile: '个人资料',
    approved: '通过',
    waiting: '待审核',
    spam: '垃圾',
    unsticky: '取消置顶',
    oldest: '按倒序',
    latest: '按正序',
    hottest: '按热度',
    reactionTitle: 'hi,觉得这篇文章咋样？选一个叭~'
  }

  useEffect(() => {
    let observer = null
    let routeListenerRegistered = false
    let cancelled = false

    const clearWaline = () => {
      if (waline) {
        waline.destroy()
        waline = null
      }
    }

    const getLoadErrorMessage = event => {
      if (typeof event?.reason === 'string') {
        return event.reason
      }

      return (
        event?.reason?.message || event?.error?.message || event?.message || ''
      )
    }

    const getLoadErrorSource = event => {
      return [
        event?.reason?.stack,
        event?.error?.stack,
        event?.filename,
        event?.reason?.fileName,
        event?.error?.fileName
      ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase()
    }

    const handleWalineLoadError = (event, options = {}) => {
      const { force = false } = options
      const message = getLoadErrorMessage(event)

      if (!message.includes('Failed to fetch')) {
        return
      }

      if (!force && !getLoadErrorSource(event).includes('@waline/client')) {
        return
      }

      event?.preventDefault?.()
      event?.stopImmediatePropagation?.()
      cancelled = true
      clearWaline()
      setLoadError(true)
    }

    window.addEventListener('unhandledrejection', handleWalineLoadError, true)
    window.addEventListener('error', handleWalineLoadError, true)

    const serverURL = siteConfig('COMMENT_WALINE_SERVER_URL')
    const originalFetch =
      typeof window.fetch === 'function' ? window.fetch : null
    let guardedFetch = null

    const isWalineRequest = input => {
      if (!serverURL) return false

      try {
        const requestUrl = typeof input === 'string' ? input : input?.url
        if (!requestUrl) return false

        const requestOrigin = new URL(requestUrl, window.location.href).origin
        const serverOrigin = new URL(serverURL, window.location.href).origin
        return requestOrigin === serverOrigin
      } catch (error) {
        return false
      }
    }

    const createFailedWalineResponse = () => {
      const body = JSON.stringify({
        errno: 1,
        errmsg: 'Failed to fetch'
      })

      if (typeof Response === 'function') {
        return new Response(body, {
          status: 503,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }

      return {
        ok: false,
        status: 503,
        json: async () => JSON.parse(body),
        text: async () => body
      }
    }

    if (originalFetch && serverURL) {
      guardedFetch = async (...args) => {
        try {
          return await originalFetch(...args)
        } catch (error) {
          if (isWalineRequest(args[0])) {
            handleWalineLoadError(
              {
                reason: error,
                preventDefault: () => {},
                stopImmediatePropagation: () => {}
              },
              { force: true }
            )
            return createFailedWalineResponse()
          }
          throw error
        }
      }

      window.fetch = guardedFetch
    }

    const mountWaline = () => {
      if (!waline) {
        setLoadError(false)
        waline = init({
          ...props,
          el: containerRef.current,
          serverURL,
          lang: siteConfig('LANG'),
          locale,
          reaction: true,
          dark: 'html.dark',
          emoji: [
            '//cdn.jsdelivr.net/npm/sticker-heo@2022.7.5/Sticker-100/',
            '//npm.elemecdn.com/@waline/emojis@1.2.0/qq',
            '//npm.elemecdn.com/@waline/emojis@1.2.0/tieba',
            '//npm.elemecdn.com/@waline/emojis@1.2.0/weibo',
            '//npm.elemecdn.com/@waline/emojis@1.2.0/bilibili',
            '//file.66619.eu.org/beluga-emoji',
            '//file.66619.eu.org/ikun-emoji'
          ]
        })
      }

      // 跳转评论
      router.events.on('routeChangeComplete', updateWaline)
      routeListenerRegistered = true
      const anchor = window.location.hash
      if (anchor) {
        // 选择需要观察变动的节点
        const targetNode = document.getElementsByClassName('wl-cards')[0]

        if (targetNode && typeof MutationObserver === 'function') {
          // 当观察到变动时执行的回调函数
          const mutationCallback = mutations => {
            for (const mutation of mutations) {
              const type = mutation.type
              if (type === 'childList') {
                const anchorElement = document.getElementById(
                  anchor.substring(1)
                )
                if (anchorElement && anchorElement.className === 'wl-item') {
                  anchorElement.scrollIntoView({
                    block: 'end',
                    behavior: 'smooth'
                  })
                  setTimeout(() => {
                    anchorElement.classList.add('animate__animated')
                    anchorElement.classList.add('animate__bounceInRight')
                    observer?.disconnect()
                  }, 300)
                }
              }
            }
          }

          // 观察子节点 变化
          observer = new MutationObserver(mutationCallback)
          observer.observe(targetNode, { childList: true })
        }
      }
    }

    const startWaline = async () => {
      try {
        if (serverURL && typeof fetch === 'function') {
          const response = await fetch(serverURL, { cache: 'no-store' })
          if (response && 'ok' in response && !response.ok) {
            throw new Error(`Waline server responded with ${response.status}`)
          }
        }
        if (!cancelled) {
          mountWaline()
        }
      } catch (error) {
        if (!cancelled) {
          waline = null
          setLoadError(true)
        }
      }
    }

    startWaline()

    return () => {
      cancelled = true
      observer?.disconnect()
      clearWaline()
      window.removeEventListener(
        'unhandledrejection',
        handleWalineLoadError,
        true
      )
      window.removeEventListener('error', handleWalineLoadError, true)
      if (guardedFetch && window.fetch === guardedFetch) {
        window.fetch = originalFetch
      }
      if (routeListenerRegistered) {
        router.events.off('routeChangeComplete', updateWaline)
      }
    }
  }, [])

  if (loadError) {
    return (
      <div className='text-sm text-gray-500 dark:text-gray-400'>
        评论服务暂时不可用，请稍后再试。
      </div>
    )
  }

  return <div ref={containerRef} />
}

export default WalineComponent
