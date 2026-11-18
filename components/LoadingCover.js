'use client'
import { useGlobal } from '@/lib/global'
import { useEffect, useRef, useState } from 'react'

// 快速跳转不闪烁：路由切换在 300ms 内完成则不显示任何指示
const SHOW_DELAY_MS = 300

/**
 * 页面切换加载指示器。
 * 历史版本是 fixed 全屏遮罩（盖住导航与页脚、阻断点击），
 * 现改为悬浮在内容区上方的小圆牌：
 * - 不遮挡 Header/Footer，不打断浏览上下文
 * - pointer-events-none，不阻断页面交互
 * - 300ms 内完成的跳转完全不显示，避免白闪
 * @see https://css-loaders.com/
 * @returns 加载动画
 */
export default function LoadingCover() {
  const { onLoading, setOnLoading } = useGlobal()
  const [isVisible, setIsVisible] = useState(false) // 初始状态设置为false，避免服务端渲染与客户端渲染不一致
  const delayTimerRef = useRef(null)

  useEffect(() => {
    // 确保在客户端渲染时才设置可见性
    if (onLoading) {
      delayTimerRef.current = setTimeout(
        () => setIsVisible(true),
        SHOW_DELAY_MS
      )
    } else {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
        delayTimerRef.current = null
      }
      setIsVisible(false)
    }
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
        delayTimerRef.current = null
      }
    }
  }, [onLoading])

  const handleClick = () => {
    setOnLoading(false) // 强行关闭加载指示
  }

  if (typeof window === 'undefined') {
    return null // 避免在服务端渲染时渲染出这个组件
  }

  return isVisible ? (
    <div
      id='loading-cover'
      className='loading-cover-chip pointer-events-none fixed left-1/2 top-24 z-50 -translate-x-1/2'>
      <style global>
        {`
          .loading-cover-chip {
            animation: loading-cover-in 0.25s ease-out;
          }
          @keyframes loading-cover-in {
            from {
              opacity: 0;
              transform: translate(-50%, -8px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }
          .loader {
            width: 20px;
            aspect-ratio: 1;
            border-radius: 50%;
            background: #000;
            box-shadow: 0 0 0 0 #0004;
            animation: l2 1.5s infinite linear;
            position: relative;
          }
          .loader:before,
          .loader:after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            box-shadow: 0 0 0 0 #0004;
            animation: inherit;
            animation-delay: -0.5s;
          }
          .loader:after {
            animation-delay: -1s;
          }
            /* 深色模式下的样式 */
          .dark .loader {
            background: #fff; /* 白色或灰色 */
            box-shadow: 0 0 0 0 #fff4; /* 使用白色阴影 */
          }
          @keyframes l2 {
            100% {
              box-shadow: 0 0 0 40px #0000;
            }
          }
      `}
      </style>
      <button
        type='button'
        aria-label='取消加载提示'
        onClick={handleClick}
        className='pointer-events-auto flex items-center justify-center rounded-full border bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95'>
        <div className='loader'></div>
      </button>
    </div>
  ) : null
}
