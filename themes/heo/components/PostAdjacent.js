import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { useEffect, useState, useRef, useCallback } from 'react'
import CONFIG from '../config'
import LazyImage from '@/components/LazyImage'

/**
 * 上一篇，下一篇文章
 * @param {prev,next} param0
 * @returns
 */
export default function PostAdjacent({ prev, next }) {
  const [isShow, setIsShow] = useState(false)
  const [isClosed, setIsClosed] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef({ x: 0, y: 0 })
  const nextPostRef = useRef(null)

  const router = useRouter()
  const { locale } = useGlobal()

  useEffect(() => {
    setIsShow(false)
    setIsClosed(false)
    setPosition({ x: 0, y: 0 })
    positionRef.current = { x: 0, y: 0 }
  }, [router])

  useEffect(() => {
    // 文章到底部时显示下一篇文章推荐
    const articleEnd = document.getElementById('article-end')
    const footerBottom = document.getElementById('footer-bottom')

    const handleIntersect = entries => {
      entries.forEach(entry => {
        if (entry.target === articleEnd) {
          if (entry.isIntersecting) {
            setIsShow(true)
          }
        } else if (entry.target === footerBottom) {
          if (entry.isIntersecting) {
            setIsShow(false)
          }
        }
      })
    }

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    }

    const observer = new IntersectionObserver(handleIntersect, options)
    if (articleEnd) observer.observe(articleEnd)
    if (footerBottom) observer.observe(footerBottom)

    return () => {
      if (articleEnd) observer.unobserve(articleEnd)
      if (footerBottom) observer.unobserve(footerBottom)
      observer.disconnect()
    }
  }, [])

  // 鼠标拖拽开始
  const handleMouseDown = useCallback(e => {
    if (e.target.closest('.close-btn') || e.target.closest('a')) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y
    }
  }, [])

  // 触摸开始
  const handleTouchStart = useCallback(e => {
    if (e.target.closest('.close-btn') || e.target.closest('a')) return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.touches[0].clientX - positionRef.current.x,
      y: e.touches[0].clientY - positionRef.current.y
    }
  }, [])

  // 拖拽逻辑 (使用全局监听以保证流畅)
  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      if (!isDragging) return

      let newX = clientX - dragStartRef.current.x
      let newY = clientY - dragStartRef.current.y

      // 边界限制 - 严格防止拖出可视区域
      // 元素初始固定在 right-10 (40px) bottom-4 (16px)
      // 假设元素尺寸 w=288px (w-72) -> 实际可能更宽，根据内容自适应
      // 这里使用 ref 获取实际宽高

      const element = nextPostRef.current
      if (!element) return

      const elementWidth = element.offsetWidth
      const elementHeight = element.offsetHeight
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const initialRight = 40
      const initialBottom = 16

      // 计算允许的最大/最小位移
      const minX = -(windowWidth - initialRight - elementWidth) // 左边界
      const maxX = initialRight // 右边界

      const minY = -(windowHeight - initialBottom - elementHeight) // 上边界
      const maxY = initialBottom // 下边界

      if (newX < minX) newX = minX
      if (newX > 10) newX = 10

      if (newY < minY) newY = minY
      if (newY > 10) newY = 10

      positionRef.current = { x: newX, y: newY }
      element.style.transform = `translate(${newX}px, ${newY}px)`
    }

    const handleMouseMove = e => {
        e.preventDefault()
        handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = e => {
        e.preventDefault() // 防止滚动
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
    }

    const handleEnd = () => {
      setIsDragging(false)
      setPosition(positionRef.current)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging])

  if (!prev || !next || !siteConfig('HEO_ARTICLE_ADJACENT', null, CONFIG)) {
    return <></>
  }

  return (
    <div id='article-end'>
      {/* 移动端 */}
      <section className='lg:hidden pt-8 text-gray-800 items-center text-xs md:text-sm flex flex-col m-1 '>
        <SmartLink
          href={`/${prev.slug}`}
          passHref
          className='cursor-pointer justify-between space-y-1 px-5 py-6 rounded-t-xl dark:bg-[#1e1e1e] border dark:border-gray-600 border-b-0 items-center dark:text-white flex flex-col w-full h-18 duration-200'>
          <div className='flex justify-start items-center w-full'>上一篇</div>
          <div className='flex justify-center items-center text-lg font-bold'>
            {prev.title}
          </div>
        </SmartLink>
        <SmartLink
          href={`/${next.slug}`}
          passHref
          className='cursor-pointer justify-between space-y-1 px-5 py-6 rounded-b-xl dark:bg-[#1e1e1e] border dark:border-gray-600 items-center dark:text-white flex flex-col w-full h-18 duration-200'>
          <div className='flex justify-start items-center w-full'>下一篇</div>
          <div className='flex justify-center items-center text-lg font-bold'>
            {next.title}
          </div>
        </SmartLink>
      </section>

      {/* 桌面端 */}
      {!isClosed && (
          <div
            ref={nextPostRef}
            id='pc-next-post'
            className={`${isShow ? 'opacity-100' : 'translate-y-24 opacity-0'} hidden md:flex fixed z-40 right-5 bottom-5 duration-200 transition-all`}
            style={{
                cursor: isDragging ? 'grabbing' : 'move',
                touchAction: 'none',
                transition: isDragging ? 'none' : undefined
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className='relative w-80 min-h-24 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col'>
                {/* 顶部图片部分 */}
                {next.pageCoverThumbnail && (
                   <div className="h-32 w-full relative overflow-hidden group">
                       <LazyImage
                          src={next.pageCoverThumbnail}
                          alt={next.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                   </div>
                )}

                {/* 内容部分 */}
                <div className={`p-4 flex flex-col justify-center ${next.pageCoverThumbnail ? '-mt-8 z-10' : 'h-full'}`}>
                   {/* 标签 */}
                   <div className={`text-xs font-bold mb-1 ${next.pageCoverThumbnail ? 'text-white text-shadow-md' : 'text-gray-500 dark:text-gray-400'}`}>
                      {locale.COMMON.NEXT_POST}
                      <i className="fas fa-arrow-right ml-1"></i>
                   </div>

                   {/* 标题 */}
                   <SmartLink
                      href={`/${next.slug}`}
                      className={`line-clamp-2 font-bold text-base leading-tight select-none cursor-pointer hover:text-indigo-600 dark:hover:text-yellow-500 transition-colors ${next.pageCoverThumbnail ? 'text-white text-shadow-md hover:text-white' : 'text-gray-900 dark:text-gray-100'}`}
                  >
                      {next?.title}
                  </SmartLink>
                </div>

                {/* 关闭按钮 */}
                <div
                    className={`close-btn absolute top-2 right-2 z-20 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer transition-colors backdrop-blur-sm ${
                        next.pageCoverThumbnail
                            ? 'bg-black/20 hover:bg-black/40 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-500'
                    }`}
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsClosed(true)
                    }}
                >
                    <i className="fas fa-times text-xs"></i>
                </div>
            </div>
          </div>
      )}
    </div>
  )
}
