import throttle from '@/lib/utils/throttle'
import { useEffect, useMemo, useRef } from 'react'

/**
 * 把回调节流后绑定到 window scroll 事件，组件卸载时自动解绑。
 *
 * 为什么需要它：`throttle()` 把 lastRun / timer 存在闭包里，所以每次 render
 * 重新调用 `throttle()` 都会得到一个 lastRun=0 的新函数，节流被完全绕过
 * （实测 20 次连续事件会触发 20 次回调，而非 1 次）。这里用 useMemo 让节流
 * 函数在整个生命周期内保持同一个实例，同时用 ref 保证回调读到的始终是最新
 * 闭包，避免拿到过期的 state。
 *
 * @param {Function} callback 滚动时要执行的逻辑，无需自己节流
 * @param {number} wait 节流间隔，毫秒
 */
export default function useThrottledScroll(callback, wait = 500) {
  const callbackRef = useRef(callback)

  // 每次 render 同步最新回调，节流函数本身不用重建
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const throttled = useMemo(
    () => throttle(() => callbackRef.current?.(), wait),
    [wait]
  )

  useEffect(() => {
    window.addEventListener('scroll', throttled, { passive: true })
    return () => {
      window.removeEventListener('scroll', throttled)
      throttled.cancel?.()
    }
  }, [throttled])

  return throttled
}
