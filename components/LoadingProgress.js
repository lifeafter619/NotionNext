import { loadExternalResource } from '@/lib/utils'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'

/**
 * 加载进度条
 * NProgress实现
 */
export default function LoadingProgress() {
  const router = useRouter()
  const nProgressRef = useRef(null)
  // 加载进度条
  useEffect(() => {
    let active = true

    const handleStart = () => {
      nProgressRef.current?.start()
    }

    const handleStop = () => {
      nProgressRef.current?.done()
    }

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeError', handleStop)
    router.events.on('routeChangeComplete', handleStop)

    void loadExternalResource(
      'https://cdnjs.snrat.com/ajax/libs/nprogress/0.2.0/nprogress.min.js',
      'js'
    )
      .then(() => {
        if (!active || !window.NProgress) return

        nProgressRef.current = window.NProgress
        // 调速
        window.NProgress.settings.minimum = 0.1
        return loadExternalResource(
          'https://cdnjs.snrat.com/ajax/libs/nprogress/0.2.0/nprogress.min.css',
          'css'
        )
      })
      .catch(() => {})

    return () => {
      active = false
      nProgressRef.current = null
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleStop)
      router.events.off('routeChangeError', handleStop)
    }
  }, [router.events])
}
