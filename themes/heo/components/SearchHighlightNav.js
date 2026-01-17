import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import replaceSearchResult from '@/components/Mark'

/**
 * 文章内搜索关键词高亮导航
 * 从搜索结果跳转过来时，悬浮显示
 */
export default function SearchHighlightNav() {
  const router = useRouter()
  const { keyword } = router.query
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef(null)

  // 初始化高亮
  useEffect(() => {
    if (!keyword) return

    // 延迟执行以确保内容已渲染
    const initHighlight = async () => {
      // 等待文章内容加载
      const article = document.getElementById('notion-article')
      if (!article) {
        setTimeout(initHighlight, 500)
        return
      }

      try {
        await replaceSearchResult({
          doms: article,
          search: keyword,
          target: {
            element: 'span',
            className: 'search-highlight bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white px-1 rounded border-b-2 border-red-500 cursor-pointer'
          }
        })
      } catch (e) {
        console.error('SearchHighlightNav: replaceSearchResult failed', e)
      }

      // 统计匹配数量
      const highlights = document.querySelectorAll('.search-highlight')

      if (highlights.length > 0) {
        setMatchCount(highlights.length)
        setIsVisible(true)
        // 自动跳转到第一个
        scrollToMatch(0)
      }
    }

    // 稍微延迟等待页面水合
    setTimeout(initHighlight, 1000)

    return () => {
      // 清理高亮（可选，但通常页面刷新或跳转会重置）
    }
  }, [keyword])

  // 跳转到指定匹配
  const scrollToMatch = (index) => {
    const highlights = document.querySelectorAll('.search-highlight')
    if (highlights.length === 0 || index < 0 || index >= highlights.length) return

    const target = highlights[index]

    // 移除其他高亮的选中状态
    highlights.forEach(el => el.classList.remove('ring-4', 'ring-red-500'))
    // 添加当前选中状态
    target.classList.add('ring-4', 'ring-red-500')

    // 滚动到视图中心
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setCurrentMatchIndex(index)
  }

  const handleNext = () => {
    const nextIndex = (currentMatchIndex + 1) % matchCount
    scrollToMatch(nextIndex)
  }

  const handlePrev = () => {
    const prevIndex = (currentMatchIndex - 1 + matchCount) % matchCount
    scrollToMatch(prevIndex)
  }

  const handleClose = () => {
    setIsVisible(false)
    // 移除 URL 中的 query 参数，但保留路径
    const { pathname, query } = router
    const params = new URLSearchParams(query)
    params.delete('keyword')
    router.replace({ pathname, query: params.toString() }, undefined, { shallow: true })

    // 移除高亮样式 (可选)
    const highlights = document.querySelectorAll('.search-highlight')
    highlights.forEach(el => {
      const text = el.textContent
      el.replaceWith(text)
    })
  }

  // 拖拽逻辑
  const [position, setPosition] = useState({ x: 20, y: 100 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    isDragging.current = true
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    })
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  if (!isVisible) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        right: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 90
      }}
      className="bg-white dark:bg-gray-800 shadow-xl rounded-xl border dark:border-gray-700 p-2 flex flex-col gap-2 w-48 transition-opacity duration-300 animate-fade-in"
    >
      {/* 拖拽手柄 */}
      <div
        onMouseDown={handleMouseDown}
        className="flex justify-between items-center cursor-move border-b dark:border-gray-700 pb-2 mb-1"
      >
        <span className="text-sm font-bold text-blue-600 dark:text-yellow-500">
          <i className="fas fa-search mr-1"></i>
          搜索定位
        </span>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1">
        已找到 {matchCount} 处 "{keyword}"
      </div>

      <div className="flex justify-between gap-2">
        <button
          onClick={handlePrev}
          className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-yellow-900 text-gray-700 dark:text-gray-200 py-1 px-2 rounded text-sm transition-colors"
        >
          <i className="fas fa-chevron-up mr-1"></i>
          上一个
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-yellow-900 text-gray-700 dark:text-gray-200 py-1 px-2 rounded text-sm transition-colors"
        >
          下一个
          <i className="fas fa-chevron-down ml-1"></i>
        </button>
      </div>

      <div className="text-center text-xs text-gray-400 mt-1">
        {currentMatchIndex + 1} / {matchCount}
      </div>
    </div>
  )
}
