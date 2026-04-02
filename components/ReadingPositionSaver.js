import { useEffect, useState, useCallback } from 'react'
import { isBrowser } from '@/lib/utils'

/**
 * 阅读进度保存和恢复组件
 * 保存用户在文章中的阅读位置，再次访问时恢复
 */
const ReadingPositionSaver = ({ postId, enabled = true }) => {
  const [showNotification, setShowNotification] = useState(false)
  const [savedPosition, setSavedPosition] = useState(null)

  // 生成存储键
  const getStorageKey = useCallback(() => {
    return `reading-position-${postId}`
  }, [postId])

  // 保存阅读位置
  const savePosition = useCallback(() => {
    if (!isBrowser || !enabled || !postId) return

    const scrollPosition = window.scrollY
    const documentHeight = document.documentElement.scrollHeight
    const viewportHeight = window.innerHeight

    // 只有当用户滚动超过100px时才保存
    if (scrollPosition > 100) {
      const data = {
        position: scrollPosition,
        percentage: Math.round(
          (scrollPosition / (documentHeight - viewportHeight)) * 100
        ),
        timestamp: Date.now()
      }
      localStorage.setItem(getStorageKey(), JSON.stringify(data))
    }
  }, [postId, enabled, getStorageKey])

  // 获取保存的位置
  const getSavedPosition = useCallback(() => {
    if (!isBrowser || !postId) return null

    try {
      const data = localStorage.getItem(getStorageKey())
      if (data) {
        const parsed = JSON.parse(data)
        // 检查是否在24小时内
        const hoursSinceLastRead = (Date.now() - parsed.timestamp) / (1000 * 60 * 60)
        if (hoursSinceLastRead < 24) {
          return parsed
        } else {
          // 超过24小时，清除记录
          localStorage.removeItem(getStorageKey())
        }
      }
    } catch {
      // 解析错误时忽略
    }
    return null
  }, [postId, getStorageKey])

  // 滚动到保存的位置
  const scrollToSavedPosition = useCallback(() => {
    if (savedPosition) {
      window.scrollTo({
        top: savedPosition.position,
        behavior: 'smooth'
      })
      setShowNotification(false)
      // 清除保存的位置
      localStorage.removeItem(getStorageKey())
    }
  }, [savedPosition, getStorageKey])

  // 关闭通知
  const dismissNotification = useCallback(() => {
    setShowNotification(false)
    // 清除保存的位置
    if (postId) {
      localStorage.removeItem(getStorageKey())
    }
  }, [postId, getStorageKey])

  // 初始化时检查是否有保存的位置
  useEffect(() => {
    if (!isBrowser || !enabled || !postId) return

    // 延迟检查，确保页面已加载完成
    const timer = setTimeout(() => {
      const position = getSavedPosition()
      if (position && position.position > 200) {
        setSavedPosition(position)
        // 自动跳转到上次位置
        window.scrollTo({
          top: position.position,
          behavior: 'smooth'
        })
        setShowNotification(true)
        // 清除保存的位置
        localStorage.removeItem(getStorageKey())
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [postId, enabled, getSavedPosition, getStorageKey])

  // 监听滚动事件，定期保存位置
  useEffect(() => {
    if (!isBrowser || !enabled || !postId) return

    let saveTimer = null
    const handleScroll = () => {
      // 防抖，避免频繁保存
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(savePosition, 1000)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // 页面卸载时保存
    const handleBeforeUnload = () => {
      savePosition()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (saveTimer) clearTimeout(saveTimer)
    }
  }, [postId, enabled, savePosition])

  // 自动隐藏通知
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false)
      }, 15000)
      return () => clearTimeout(timer)
    }
  }, [showNotification])

  if (!showNotification || !savedPosition) return null

  return (
    <div className='fixed bottom-20 md:bottom-10 left-0 right-0 mx-auto w-fit max-w-md z-50 animate-fade-in'>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between gap-3 min-w-[300px]'>
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          <svg
            className='w-5 h-5 text-blue-500 shrink-0 self-start mt-0.5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z'
            />
          </svg>
          <div className='flex flex-col text-sm md:text-base text-gray-700 dark:text-gray-300'>
             <span className='font-bold'>已跳转至：</span>
             <span className='truncate'>上次阅读位置 ({savedPosition.percentage}%)</span>
          </div>
        </div>
        <div className='flex items-center gap-2 shrink-0 self-start mt-0.5'>
            <button
            onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
                setShowNotification(false)
            }}
            className='px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap'>
            返回开头
            </button>
            <button
            onClick={dismissNotification}
            className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'>
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
                />
            </svg>
            </button>
        </div>
      </div>
    </div>
  )
}

export default ReadingPositionSaver
