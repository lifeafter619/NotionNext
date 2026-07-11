import SmartLink from '@/components/SmartLink'
import { useEffect, useState } from 'react'

/**
 * 一个swipe组件
 * 垂直方向，定时滚动
 * @param {*} param0
 * @returns
 */
export function Swipe({ items }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocusWithin, setIsFocusWithin] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const safeItems = Array.isArray(items)
    ? items.filter(item => item?.title)
    : []
  const isPaused = isHovered || isFocusWithin

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = event => setPrefersReducedMotion(event.matches)

    setPrefersReducedMotion(mediaQuery.matches)
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener?.(handleChange)
    return () => mediaQuery.removeListener?.(handleChange)
  }, [])

  useEffect(() => {
    if (!safeItems.length) {
      setActiveIndex(0)
      return
    }

    setActiveIndex(index => Math.min(index, safeItems.length - 1))
    if (isPaused || prefersReducedMotion) return

    const interval = setInterval(() => {
      // 函数式 setState，避免把 activeIndex 放进依赖数组导致每秒重建 interval
      setActiveIndex(prev => (prev + 1) % safeItems.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [isPaused, prefersReducedMotion, safeItems.length])

  const handleBlur = event => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsFocusWithin(false)
    }
  }

  return (
    <div
      className='h-full relative w-full overflow-hidden'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocusWithin(true)}
      onBlur={handleBlur}>
      {safeItems.map((item, index) => {
        const className = `whitespace-nowrap absolute top-0 bottom-0 w-full h-full flex justify-center items-center line-clamp-1 transform transition-transform duration-500 motion-reduce:duration-0 motion-reduce:transition-none ${
            index === activeIndex
              ? 'translate-y-0 slide-in'
              : 'translate-y-full slide-out'
          }`

        if (!item.url) {
          return (
            <div key={`${item.title}-${index}`} className={className}>
              {item.title}
            </div>
          )
        }

        return (
          <SmartLink
            key={`${item.url}-${index}`}
            href={item.url}
            className={className}
            tabIndex={index === activeIndex ? 0 : -1}>
            {item.title}
          </SmartLink>
        )
      })}

      <style jsx>{`
        .slide-in {
          animation-name: slide-in;
          animation-duration: 0.5s;
          animation-fill-mode: forwards;
        }

        .slide-out {
          animation-name: slide-out;
          animation-duration: 0.5s;
          animation-fill-mode: forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .slide-in,
          .slide-out {
            animation: none;
          }
        }

        @keyframes slide-in {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slide-out {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-100%);
          }
        }
      `}</style>
    </div>
  )
}

export default Swipe
