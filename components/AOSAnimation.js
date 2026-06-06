import { isBrowser, loadExternalResource } from '@/lib/utils'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
// import AOS from 'aos'

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
      if (cancelled || !document.querySelector('[data-aos]')) return

      await Promise.all([
        loadExternalResource('/js/aos.js', 'js'),
        loadExternalResource('/css/aos.css', 'css')
      ])

      if (!cancelled && window.AOS) {
        if (!aosInitialized) {
          window.AOS.init()
          aosInitialized = true
        } else if (window.AOS.refreshHard) {
          window.AOS.refreshHard()
        }
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
    const taskId = window.requestIdleCallback(callback, { timeout: 1500 })
    return () => window.cancelIdleCallback?.(taskId)
  }

  const timeoutId = window.setTimeout(() => callback(), 0)
  return () => window.clearTimeout(timeoutId)
}
