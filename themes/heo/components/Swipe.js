import SmartLink from './HeoLink'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * 一个swipe组件
 * 垂直方向，定时滚动
 * @param {*} param0
 * @returns
 */
export function Swipe({ items, interval = 3000 }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocusWithin, setIsFocusWithin] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [expandedNotice, setExpandedNotice] = useState(null)
  const dialogRef = useRef(null)
  const dialogTitleId = useId()
  const safeItems = Array.isArray(items)
    ? items.filter(item => item?.title)
    : []
  const isPaused = isHovered || isFocusWithin || Boolean(expandedNotice)

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
    if (safeItems.length < 2 || isPaused || prefersReducedMotion) return

    const timer = setInterval(() => {
      // 函数式 setState，避免把 activeIndex 放进依赖数组导致每秒重建 interval
      setActiveIndex(prev => (prev + 1) % safeItems.length)
    }, interval)
    return () => clearInterval(timer)
  }, [interval, isPaused, prefersReducedMotion, safeItems.length])

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
        const active = index === activeIndex
        const title = (
          <span className='block w-full min-w-0 truncate text-center md:w-auto md:min-w-max md:overflow-visible'>
            {item.title}
          </span>
        )
        const className = `whitespace-nowrap absolute top-0 bottom-0 w-full h-full flex justify-center items-center transform transition-transform duration-500 motion-reduce:duration-0 motion-reduce:transition-none ${
          index === activeIndex
            ? 'translate-y-0 slide-in'
            : 'translate-y-full slide-out pointer-events-none'
        }`

        if (!item.url) {
          return (
            <button
              key={`${item.title}-${index}`}
              type='button'
              className={className}
              tabIndex={active ? 0 : -1}
              aria-hidden={!active}
              aria-haspopup='dialog'
              onClick={() => {
                setExpandedNotice(item)
                dialogRef.current?.showModal()
              }}>
              {title}
            </button>
          )
        }

        return (
          <SmartLink
            key={`${item.url}-${index}`}
            href={item.url}
            className={className}
            tabIndex={active ? 0 : -1}
            aria-hidden={!active}>
            {title}
          </SmartLink>
        )
      })}

      <dialog
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        onClose={() => setExpandedNotice(null)}
        className='w-[calc(100%-2rem)] max-w-lg max-h-[80vh] overflow-y-auto rounded-xl p-5 bg-[var(--heo-color-card)] dark:bg-[var(--heo-color-card-dark)] text-[var(--heo-color-text)] dark:text-white backdrop:bg-black/50 cursor-auto'>
        <form method='dialog' className='flex justify-end'>
          <button
            type='submit'
            aria-label='Close notification'
            className='w-10 h-10 text-2xl'>
            ×
          </button>
        </form>
        <p id={dialogTitleId} className='whitespace-pre-wrap break-words'>
          {expandedNotice?.title}
        </p>
      </dialog>

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
