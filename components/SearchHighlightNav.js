import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import replaceSearchResult from '@/components/Mark'

/**
 * 文章内搜索关键词高亮导航组件（通用版本）
 * 从搜索结果跳转过来时，悬浮显示一个可拖拽的导航面板
 * 支持快速跳转到匹配位置
 * 
 * 使用方法：在文章页面组件中引入并放置即可
 * import SearchHighlightNav from '@/components/SearchHighlightNav'
 * <SearchHighlightNav />
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
    const initHighlight = () => {
      // 等待文章内容加载
      const article = document.getElementById('notion-article')
      if (!article) {
        setTimeout(initHighlight, 500)
        return
      }

      replaceSearchResult({
        doms: article,
        search: keyword,
        target: {
          element: 'span',
          className: 'search-highlight bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white px-1 rounded border-b-2 border-red-500 cursor-pointer'
        }
      }).then(() => {
        // 统计匹配数量
        const highlights = document.querySelectorAll('.search-highlight')

        if (highlights.length > 0) {
          setMatchCount(highlights.length)
          setIsVisible(true)
          // 自动跳转到第一个
          scrollToMatch(0)
        }
      }).catch((e) => {
        console.error('SearchHighlightNav: replaceSearchResult failed', e)
      })
    }

    // 稍微延迟等待页面水合
    const timer = setTimeout(initHighlight, 1000)

    return () => {
      // 清理定时器
      clearTimeout(timer)
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

  // 监听输入框变化，直接跳转
  const handleInputChange = (e) => {
    const val = parseInt(e.target.value)
    if (!isNaN(val) && val >= 1 && val <= matchCount) {
        scrollToMatch(val - 1)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    // 移除 URL 中的 keyword 参数，但保留其他参数
    const { pathname, query } = router
    const { keyword: _keyword, ...otherQuery } = query
    router.replace({ pathname, query: otherQuery }, undefined, { shallow: true })

    // 移除高亮样式
    const highlights = document.querySelectorAll('.search-highlight')
    highlights.forEach(el => {
      const text = document.createTextNode(el.textContent || '')
      el.replaceWith(text)
    })
  }

  // 拖拽逻辑
  const [position, setPosition] = useState({ x: 20, y: 100 }) // x: right, y: top
  const isDragging = useRef(false)
  const dragStartMouseRef = useRef({ x: 0, y: 0 })
  const initialDragPosRef = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    isDragging.current = true
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY }
    initialDragPosRef.current = { x: position.x, y: position.y }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    e.preventDefault()

    // Right: 鼠标右移 (clientX 增加) -> right 值应减小
    const deltaX = dragStartMouseRef.current.x - e.clientX

    // Top: 鼠标下移 (clientY 增加) -> top 值应增加
    // 注意：CSS top 属性增加意味着向下移动，鼠标 y 增加也意味着向下移动。
    // 所以 deltaY = e.clientY - dragStartMouseRef.current.y 是移动的距离，应该直接加到 initialTop 上
    const deltaY = e.clientY - dragStartMouseRef.current.y

    let newX = initialDragPosRef.current.x + deltaX
    let newY = initialDragPosRef.current.y + deltaY

    // 边界检查
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const navWidth = containerRef.current ? containerRef.current.offsetWidth : 224
    const navHeight = containerRef.current ? containerRef.current.offsetHeight : 200

    // 限制在屏幕内
    const maxRight = windowWidth - navWidth
    const maxTop = windowHeight - navHeight

    newX = Math.max(0, Math.min(newX, maxRight))
    newY = Math.max(0, Math.min(newY, maxTop))

    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  // 键盘快捷键支持
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'ArrowDown' || e.key === 'n') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowUp' || e.key === 'p') {
        e.preventDefault()
        handlePrev()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, currentMatchIndex, matchCount])

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
      className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 shadow-2xl rounded-xl border border-gray-200/50 dark:border-gray-700 p-3 flex flex-col gap-3 w-56 transition-all duration-300 hover:shadow-3xl"
    >
      {/* 拖拽手柄 */}
      <div
        onMouseDown={handleMouseDown}
        className="flex justify-between items-center cursor-move border-b border-gray-200/50 dark:border-white/10 pb-2 mb-1 select-none"
      >
        <span className="text-sm font-bold text-blue-600 dark:text-yellow-500 pointer-events-none flex items-center gap-1.5">
          <i className="fas fa-search-location"></i>
          内容定位
        </span>
        <button
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()} // 防止点击关闭时触发拖拽
          className="text-gray-400 hover:text-red-500 transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
          title="关闭 (ESC)"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-300 text-center">
        关键词 <span className="font-bold text-blue-600 dark:text-yellow-500">&quot;{keyword}&quot;</span>
        <span className="mx-1">|</span>
        共 <span className="font-bold">{matchCount}</span> 处
      </div>

      <div className="flex justify-between gap-2">
        <button
          onClick={handlePrev}
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-yellow-500 text-gray-700 dark:text-gray-200 py-1.5 px-2 rounded-lg text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1 group"
          title="上一个 (↑ / P)"
        >
          <i className="fas fa-chevron-up text-xs text-gray-400 group-hover:text-blue-500 dark:group-hover:text-yellow-500"></i>
          上一个
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-yellow-500 text-gray-700 dark:text-gray-200 py-1.5 px-2 rounded-lg text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1 group"
          title="下一个 (↓ / N)"
        >
          下一个
          <i className="fas fa-chevron-down text-xs text-gray-400 group-hover:text-blue-500 dark:group-hover:text-yellow-500"></i>
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg py-1.5 px-2 border border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-500">第</span>
        <input
            type="number"
            min="1"
            max={matchCount}
            value={currentMatchIndex + 1}
            onChange={handleInputChange}
            className="w-12 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm font-medium text-blue-600 dark:text-yellow-500 focus:outline-none focus:border-blue-500 dark:focus:border-yellow-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-yellow-500 transition-colors py-0.5"
        />
        <span className="text-xs text-gray-500">/ {matchCount} 处</span>
      </div>

      {/* 快捷键提示 */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center border-t border-gray-100 dark:border-gray-800 pt-2">
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">↑</kbd>
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs mx-1">↓</kbd>
        导航
        <span className="mx-2">|</span>
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">ESC</kbd>
        关闭
      </div>
    </div>
  )
}
