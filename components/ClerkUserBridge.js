import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'

/**
 * 把 Clerk 的登录态同步进全局上下文。
 * 单独成组件并由 lib/global.js 动态加载：useUser 的静态 import 会把
 * ~25KB gzip 的 @clerk/react 运行时拖进所有页面的 _app bundle，
 * 而绝大多数访客根本不会登录。
 */
export default function ClerkUserBridge({ onChange }) {
  const { isLoaded, isSignedIn, user } = useUser()

  useEffect(() => {
    onChange({ isLoaded, isSignedIn, user })
  }, [isLoaded, isSignedIn, user, onChange])

  return null
}
