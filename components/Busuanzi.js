import busuanzi from '@/lib/plugins/busuanzi'
import { useRouter } from 'next/router'
import { useGlobal } from '@/lib/global'
import { useEffect } from 'react'

let path = ''

export default function Busuanzi() {
  const { theme } = useGlobal()
  const router = useRouter()

  // 路由变化时重新获取；监听必须在 effect 中注册并清理，
  // 否则每次渲染都会累积一个新的 routeChangeComplete 监听器
  useEffect(() => {
    const handleRouteChange = url => {
      if (url !== path) {
        path = url
        busuanzi.fetch()
      }
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  // 更换主题时更新
  useEffect(() => {
    if (theme) {
      busuanzi.fetch()
    }
  }, [theme])
  return null
}
