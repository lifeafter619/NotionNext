import { isBrowser, loadExternalResource } from '@/lib/utils'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

let aosInitialized = false

/**
 * 加载滚动动画
 * 改从外部CDN读取
 * https://michalsnik.github.io/aos/
 */
export default function AOSAnimation() {
  const router = useRouter()

  useEffect(() => {
    if (!isBrowser) return

    let cancelled = false
    const cancelTask = scheduleIdleTask(async () => {
      if (
        cancelled ||
        aosInitialized ||
        !document.querySelector('[data-aos]') ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        return
      }

      await Promise.all([
        loadExternalResource('/js/aos.js', 'js'),
        loadExternalResource('/css/aos.css', 'css')
      ])

      if (!cancelled && window.AOS && !aosInitialized) {
        window.AOS.init({
          debounceDelay: 100,
          throttleDelay: 120,
          once: true
        })
        aosInitialized = true
      }
    })

    return () => {
      cancelled = true
      cancelTask()
    }
  }, [router.asPath])

  return null
}

function scheduleIdleTask(callback) {
  if (window.requestIdleCallback) {
    const taskId = window.requestIdleCallback(callback, { timeout: 3000 })
    return () => window.cancelIdleCallback?.(taskId)
  }

  const timeoutId = window.setTimeout(() => callback(), 2000)
  return () => window.clearTimeout(timeoutId)
}
