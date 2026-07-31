import { useEffect, useRef, useState } from 'react'
import { init } from '@waline/client'
import { useRouter } from 'next/router'
import '@waline/client/style'
import { siteConfig } from '@/lib/config'
import {
  fetchWalineEmojiInfoWithFallback,
  isWalineEmojiInfoSource,
  retryWalineEmojiImage,
  WALINE_EMOJI_PRIMARY_PRESETS,
  WALINE_REACTION_PRIMARY_URLS
} from '@/lib/walineEmojiProxy'

const path = ''
let waline = null
/**
 * @see https://waline.js.org/guide/get-started.html
 * @param {*} props
 * @returns
 */
const WalineComponent = props => {
  // createRef 每次渲染都会生成新 ref，异步 init 期间一旦重渲染就会拿到 null 容器，
  // 导致评论区静默空白；必须用 useRef 保持稳定
  const containerRef = useRef(null)
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
    const notionHost = siteConfig('NOTION_HOST')
    const walineContainer = containerRef.current

    const handleWalineEmojiError = event => {
      const target = event.target
      if (target?.tagName === 'IMG') {
        retryWalineEmojiImage(target, notionHost)
      }
    }

    walineContainer?.addEventListener('error', handleWalineEmojiError, true)

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
        // Windows dev 构建的堆栈路径用反斜杠(@waline\api)，统一成正斜杠再匹配
        .replace(/\\/g, '/')
        .toLowerCase()
    }

    const handleWalineLoadError = (event, options = {}) => {
      const { force = false } = options
      const message = getLoadErrorMessage(event)

      // 包括裸的 'Failed to fetch',以及 @waline/api 内部 re-throw 后
      // 包装出来的 'Get comment/counter data failed with N: Failed to fetch'
      const isFetchFailure =
        message.includes('Failed to fetch') ||
        /^Get \w+ failed with \d+:/.test(message)

      if (!isFetchFailure) {
        return
      }

      // force 通道(本组件 fetch guard 主动调用)直接处理;
      // 否则只处理来源确属 waline 的 rejection(@waline/client 或 @waline/api)。
      if (!force) {
        const source = getLoadErrorSource(event)
        if (
          !source.includes('@waline/client') &&
          !source.includes('@waline/api')
        ) {
          return
        }
        // 阻止其它无关 rejection 监听器再次抛出
        event?.preventDefault?.()
        event?.stopImmediatePropagation?.()
      }

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

    // waline 的编辑框与主输入框共享 WALINE_COMMENT_BOX_EDITOR 草稿 storage。
    // 编辑结束后 waline 并不总能清空草稿：
    //  - 提交成功但回包缺 data 时，内部 emit('submit') 同步抛错，清空逻辑被跳过
    //  - 点“取消编辑”时 waline 从不清空
    // 残留草稿会在主输入框重新挂载（编辑期间它被 v-if 卸载）时读出来。
    // 因此监听编辑框（.wl-edit-wrapper）从 DOM 消失的时刻，强制清空共享草稿，
    // 并派发合成 StorageEvent 让 vueuse useStorage 的已挂载实例同步。
    const WALINE_EDITOR_DRAFT_KEY = 'WALINE_COMMENT_BOX_EDITOR'
    let editSessionObserver = null

    const clearSharedEditorDraft = () => {
      let oldValue = null
      try {
        oldValue = window.localStorage?.getItem(WALINE_EDITOR_DRAFT_KEY)
        if (!oldValue) return
        window.localStorage.setItem(WALINE_EDITOR_DRAFT_KEY, '')
      } catch (error) {
        return
      }
      try {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: WALINE_EDITOR_DRAFT_KEY,
            oldValue,
            newValue: '',
            storageArea: window.localStorage
          })
        )
      } catch (error) {}
    }

    const watchEditSession = () => {
      const container = containerRef.current
      if (!container || typeof MutationObserver !== 'function') return
      let editing = Boolean(container.querySelector('.wl-edit-wrapper'))
      editSessionObserver = new MutationObserver(() => {
        const nowEditing = Boolean(container.querySelector('.wl-edit-wrapper'))
        if (editing && !nowEditing) {
          clearSharedEditorDraft()
        }
        editing = nowEditing
      })
      editSessionObserver.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      })
    }

    if (originalFetch && serverURL) {
      guardedFetch = async (...args) => {
        if (isWalineEmojiInfoSource(args[0]?.url || args[0], notionHost)) {
          return fetchWalineEmojiInfoWithFallback(
            originalFetch,
            args[0],
            args[1],
            notionHost
          )
        }

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
          reaction: WALINE_REACTION_PRIMARY_URLS,
          dark: 'html.dark',
          emoji: [
            '//cdn.jsdelivr.net/npm/sticker-heo@2022.7.5/Sticker-100/',
            ...WALINE_EMOJI_PRIMARY_PRESETS,
            '//file.66619.eu.org/beluga-emoji',
            '//file.66619.eu.org/ikun-emoji'
          ]
        })
        watchEditSession()
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
      editSessionObserver?.disconnect()
      walineContainer?.removeEventListener(
        'error',
        handleWalineEmojiError,
        true
      )
      // 编辑进行中直接离开页面：destroy 后不会再触发 observer，主动清一次
      if (containerRef.current?.querySelector('.wl-edit-wrapper')) {
        clearSharedEditorDraft()
      }
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

  return (
    <>
      <style>{`
        /* 0. 在 Waline 作用域内强制 content-box
              heo 主题 style.js 里的全局 *{box-sizing:border-box} 会覆盖
              waline.css 的 [data-waline] *{box-sizing:content-box},
              导致 .wl-card{flex:1;width:0} 在嵌套下盒模型计算异常。 */
        #waline-comment :where(.wl-card-item, .wl-item),
        #waline-comment :where(.wl-card, .wl-content, .wl-user, .wl-head,
                                .wl-meta, .wl-card .wl-quote) {
          box-sizing: content-box;
        }

        /* 不能给 .wl-card-item 设 width:100%——上面强制的 content-box 会让
              100% + 自身 padding 超出父级，嵌套层层放大后撑出横向滚动。
              flex/grid 的块级子项本身就会占满宽度，无需显式 width。 */
        #waline-comment :where(.wl-card-item, .wl-item) {
          align-items: flex-start;
        }

        /* 兜底：任何内部溢出都不允许把评论区撑出横向滚动 */
        #waline-comment {
          overflow-x: clip;
        }

        #waline-comment .wl-content {
          word-break: break-word;
          overflow-wrap: anywhere;
          /* 包含 .wl-reply-to 的浮动，避免其溢出到操作栏 */
          display: flow-root;
        }

        /* waline 默认给 .wl-reply-to 设 float:left + margin-top:1em，
              与段落自带的 margin-top 对齐；但 tailwind preflight 把 p 的
              margin 清零后，@昵称 会掉到正文第一行下面。归零后
              @昵称 与正文首行同行、正文自然环绕，排布整齐。 */
        #waline-comment .wl-content .wl-reply-to {
          margin: 0 0.5em 0 0;
        }

        /* 仅【顶层第一层】卡片用 grid 布局(头像+内容两列);
              嵌套回复(.wl-card-item .wl-card-item)恢复 waline 默认 display:flex,
              让其递归 padding 重新生效,由此形成层级缩进。 */
        #waline-comment .wl-cards > .wl-card-item,
        #waline-comment .wl-reply > .wl-item {
          display: grid;
          grid-template-columns: max-content minmax(0, 1fr);
          column-gap: 0.75em;
          align-items: flex-start;
        }

        #waline-comment .wl-card-item .wl-card-item {
          display: flex;
        }

        #waline-comment .wl-card,
        #waline-comment .wl-content {
          min-width: 0;
        }

        #waline-comment .wl-card {
          width: auto;
        }

        #waline-comment .wl-cards .wl-user {
          margin-inline-end: 0;
        }

        #waline-comment .wl-card .wl-quote {
          margin-top: 0.75em;
          padding-inline-start: 0.75em;
        }
      `}</style>
      <div id='waline-comment' ref={containerRef} />
    </>
  )
}

export default WalineComponent
