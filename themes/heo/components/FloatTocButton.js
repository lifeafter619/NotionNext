import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Catalog from './Catalog'
import throttle from '@/lib/utils/throttle'
import { uuidToId } from 'notion-utils'
import { useArticleToc } from './useArticleToc'

const DESKTOP_TOC_BREAKPOINT = 1280
const DESKTOP_ZOOM_MIN_VIEWPORT = 720
const MOBILE_DRAWER_DEFAULT_HEIGHT_VH = 58
const MOBILE_DRAWER_MIN_HEIGHT_VH = 40
const MOBILE_DRAWER_MAX_HEIGHT_VH = 90
const MOBILE_ACTION_BUTTON_SIZE = 44
const MOBILE_ACTION_GAP = 12
const MOBILE_ACTION_DEFAULT_RIGHT = 16
const MOBILE_ACTION_DEFAULT_BOTTOM = 80
const MOBILE_ACTION_SCREEN_MARGIN = 16

function hasDesktopPointer() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }

  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function getAvailableScreenWidth() {
  if (typeof window === 'undefined') return 0

  return Math.max(window.screen?.width || 0, window.outerWidth || 0)
}

function shouldUseDesktopTocMode() {
  if (typeof window === 'undefined') return false

  if (window.innerWidth >= DESKTOP_TOC_BREAKPOINT) {
    return true
  }

  return (
    window.innerWidth >= DESKTOP_ZOOM_MIN_VIEWPORT &&
    getAvailableScreenWidth() >= DESKTOP_TOC_BREAKPOINT &&
    hasDesktopPointer()
  )
}

/**
 * 悬浮目录按钮
 * 移动端始终显示，桌面端滚动超过右侧边栏目录时显示
 */
export default function FloatTocButton(props) {
  const [tocVisible, changeTocVisible] = useState(false)
  const [showOnDesktop, setShowOnDesktop] = useState(false)
  const [showMobileActions, setShowMobileActions] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState(null)

  // 移动端按钮展开状态
  const [isExpandedButton, setIsExpandedButton] = useState(false)
  // 移动端按钮位置偏移 {x: right, y: bottom}
  const [buttonPos, setButtonPos] = useState(
    /** @type {{x: number | null, y: number | null}} */ ({
      x: null,
      y: null
    })
  )
  // 移动端抽屉高度
  const [drawerHeight, setDrawerHeight] = useState(
    `${MOBILE_DRAWER_DEFAULT_HEIGHT_VH}vh`
  )
  const [touchStartY, setTouchStartY] = useState(null)
  const [touchStartHeight, setTouchStartHeight] = useState(null)
  const [touchStartButton, setTouchStartButton] = useState({ x: 0, y: 0 })

  // 桌面端拖拽状态
  const [desktopPos, setDesktopPos] = useState({ x: 20, y: 300 })
  const [isDraggingDesktop, setIsDraggingDesktop] = useState(false)
  const [isDesktopTocMode, setIsDesktopTocMode] = useState(() =>
    shouldUseDesktopTocMode()
  )

  useEffect(() => {
    setDesktopPos(prev => ({ ...prev, y: window.innerHeight / 2 - 100 }))
  }, [])

  useEffect(() => {
    const syncViewport = () => {
      setIsDesktopTocMode(shouldUseDesktopTocMode())
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => {
      window.removeEventListener('resize', syncViewport)
    }
  }, [])

  useEffect(() => {
    if (isDesktopTocMode) {
      setShowMobileActions(false)
      return
    }

    let frameId = null
    const syncMobileActions = () => {
      frameId = null
      const hasPostHero = Boolean(document.getElementById('post-bg'))
      setShowMobileActions(!hasPostHero || window.scrollY > 280)
    }
    const handleScroll = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(syncMobileActions)
    }

    syncMobileActions()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [isDesktopTocMode])

  // Use Refs for drag calculations to avoid stale closures in event listeners
  const dragStartMouseRef = useRef({ x: 0, y: 0 })
  const initialDragPosRef = useRef({ x: 0, y: 0 })
  const isMouseDownRef = useRef(false)
  const isDraggingDesktopRef = useRef(false)
  const desktopDragHandlersRef = useRef({ mouseMove: null, mouseUp: null })

  const { post, lock } = props
  const hasServerToc = Array.isArray(post?.toc) && post.toc.length > 0
  const shouldBuildFallbackToc =
    Boolean(post) &&
    !lock &&
    (hasServerToc || !isDesktopTocMode || showOnDesktop)
  const toc = useArticleToc(post?.toc, shouldBuildFallbackToc)

  const toggleToc = () => {
    // 如果正在拖拽，不触发点击
    if (isDraggingDesktop) return
    changeTocVisible(!tocVisible)
  }

  // 初始加载后确保移动端按钮保持紧凑，避免遮挡正文。
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpandedButton(false)
    }, 6000)
    return () => clearTimeout(timer)
  }, [])

  // 移动端拖动按钮逻辑
  const handleButtonTouchStart = e => {
    e.stopPropagation()
    const touch = e.touches[0]
    setTouchStartButton({
      x: touch.clientX,
      y: touch.clientY,
      initialRight:
        buttonPos.x !== null ? buttonPos.x : MOBILE_ACTION_DEFAULT_RIGHT,
      initialBottom:
        buttonPos.y !== null ? buttonPos.y : MOBILE_ACTION_DEFAULT_BOTTOM
    })
  }

  const handleButtonTouchMove = e => {
    e.stopPropagation()
    e.preventDefault()
    const touch = e.touches[0]
    const deltaX = touchStartButton.x - touch.clientX
    const deltaY = touchStartButton.y - touch.clientY

    let newRight = touchStartButton.initialRight + deltaX
    let newBottom = touchStartButton.initialBottom + deltaY

    const mobileActionGroup = document.getElementById(
      'heo-mobile-floating-actions'
    )
    const groupWidth =
      mobileActionGroup?.offsetWidth || MOBILE_ACTION_BUTTON_SIZE
    const groupHeight =
      mobileActionGroup?.offsetHeight ||
      MOBILE_ACTION_BUTTON_SIZE * 2 + MOBILE_ACTION_GAP

    const maxRight = Math.max(
      MOBILE_ACTION_SCREEN_MARGIN,
      window.innerWidth - groupWidth - MOBILE_ACTION_SCREEN_MARGIN
    )
    const maxBottom = Math.max(
      MOBILE_ACTION_SCREEN_MARGIN,
      window.innerHeight - groupHeight - MOBILE_ACTION_SCREEN_MARGIN
    )

    newRight = Math.max(
      MOBILE_ACTION_SCREEN_MARGIN,
      Math.min(newRight, maxRight)
    )
    newBottom = Math.max(
      MOBILE_ACTION_SCREEN_MARGIN,
      Math.min(newBottom, maxBottom)
    )

    setButtonPos({
      x: newRight,
      y: newBottom
    })
  }

  const clearDesktopDragListeners = useCallback(() => {
    const { mouseMove, mouseUp } = desktopDragHandlersRef.current
    if (mouseMove) {
      window.removeEventListener('mousemove', mouseMove)
    }
    if (mouseUp) {
      window.removeEventListener('mouseup', mouseUp)
    }
    desktopDragHandlersRef.current = { mouseMove: null, mouseUp: null }
  }, [])

  // 桌面端拖拽逻辑
  const handleDesktopMouseMove = useCallback(e => {
    if (!isMouseDownRef.current) return

    const deltaX = dragStartMouseRef.current.x - e.clientX // 向左移动，right增加
    const deltaY = dragStartMouseRef.current.y - e.clientY // 向上移动，bottom增加

    // 移动距离检查
    if (!isDraggingDesktopRef.current) {
      if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return
      isDraggingDesktopRef.current = true
      setIsDraggingDesktop(true)
    }

    e.preventDefault()

    let newRight = initialDragPosRef.current.x + deltaX
    let newBottom = initialDragPosRef.current.y + deltaY

    // 严格边界检查
    const element = document.getElementById('float-toc-button')
    const width = element ? element.offsetWidth : 288
    const height = element ? element.offsetHeight : 120

    const maxRight = window.innerWidth - width
    const maxBottom = window.innerHeight - height

    newRight = Math.max(0, Math.min(newRight, maxRight))
    newBottom = Math.max(0, Math.min(newBottom, maxBottom))

    setDesktopPos({ x: newRight, y: newBottom })
  }, [])

  const handleDesktopMouseUp = useCallback(() => {
    isMouseDownRef.current = false
    clearDesktopDragListeners()

    // 延迟一点设置 dragging 为 false，防止触发 click 事件
    setTimeout(() => {
      isDraggingDesktopRef.current = false
      setIsDraggingDesktop(false)
    }, 0)
  }, [clearDesktopDragListeners])

  const handleDesktopMouseDown = e => {
    clearDesktopDragListeners()
    isMouseDownRef.current = true
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY }
    initialDragPosRef.current = { x: desktopPos.x, y: desktopPos.y }

    desktopDragHandlersRef.current = {
      mouseMove: handleDesktopMouseMove,
      mouseUp: handleDesktopMouseUp
    }
    window.addEventListener('mousemove', handleDesktopMouseMove)
    window.addEventListener('mouseup', handleDesktopMouseUp)
  }

  // 移动端抽屉高度调整逻辑
  const handleDrawerTouchStart = e => {
    e.stopPropagation()
    const touch = e.touches[0]
    setTouchStartY(touch.clientY)
    const currentHeight = document.getElementById('toc-drawer').clientHeight
    setTouchStartHeight(currentHeight)
  }

  const handleDrawerTouchMove = e => {
    if (!touchStartY) return
    e.stopPropagation()
    e.preventDefault()
    const touch = e.touches[0]
    const deltaY = touchStartY - touch.clientY
    const newHeight = touchStartHeight + deltaY
    const vh = (newHeight / window.innerHeight) * 100
    if (
      vh >= MOBILE_DRAWER_MIN_HEIGHT_VH &&
      vh <= MOBILE_DRAWER_MAX_HEIGHT_VH
    ) {
      setDrawerHeight(`${vh}vh`)
    }
  }

  const handleDrawerTouchEnd = () => {
    setTouchStartY(null)
    setTouchStartHeight(null)
  }

  // 重新设计: 使用 Ref 来存储 startY 和 startHeight 以避免闭包陷阱
  const drawerDragRef = useRef({ startY: 0, startHeight: 0, isDragging: false })
  const drawerDragHandlersRef = useRef({ mouseMove: null, mouseUp: null })

  const clearDrawerDragListeners = useCallback(() => {
    const { mouseMove, mouseUp } = drawerDragHandlersRef.current
    if (mouseMove) {
      window.removeEventListener('mousemove', mouseMove)
    }
    if (mouseUp) {
      window.removeEventListener('mouseup', mouseUp)
    }
    drawerDragHandlersRef.current = { mouseMove: null, mouseUp: null }
  }, [])

  const handleDrawerMouseMoveV2 = useCallback(e => {
    if (!drawerDragRef.current.isDragging) return
    e.preventDefault()
    const deltaY = drawerDragRef.current.startY - e.clientY
    const newHeight = drawerDragRef.current.startHeight + deltaY
    const vh = (newHeight / window.innerHeight) * 100
    if (
      vh >= MOBILE_DRAWER_MIN_HEIGHT_VH &&
      vh <= MOBILE_DRAWER_MAX_HEIGHT_VH
    ) {
      setDrawerHeight(`${vh}vh`)
    }
  }, [])

  const handleDrawerMouseUpV2 = useCallback(() => {
    drawerDragRef.current.isDragging = false
    clearDrawerDragListeners()
  }, [clearDrawerDragListeners])

  const handleDrawerMouseDownV2 = e => {
    e.stopPropagation()
    const currentHeight = document.getElementById('toc-drawer').clientHeight
    clearDrawerDragListeners()
    drawerDragRef.current = {
      startY: e.clientY,
      startHeight: currentHeight,
      isDragging: true
    }
    drawerDragHandlersRef.current = {
      mouseMove: handleDrawerMouseMoveV2,
      mouseUp: handleDrawerMouseUpV2
    }
    window.addEventListener('mousemove', handleDrawerMouseMoveV2)
    window.addEventListener('mouseup', handleDrawerMouseUpV2)
  }

  useEffect(() => {
    return () => {
      isMouseDownRef.current = false
      drawerDragRef.current.isDragging = false
      clearDesktopDragListeners()
      clearDrawerDragListeners()
    }
  }, [clearDesktopDragListeners, clearDrawerDragListeners])

  // 监听滚动，使用 IntersectionObserver 替代 scroll 事件以优化性能
  useEffect(() => {
    if (!isDesktopTocMode) {
      setShowOnDesktop(false)
      return
    }

    let observer = null
    let retryTimer = null
    let retryCount = 0

    const observeSidebarCatalog = () => {
      const sideRight = document.getElementById('sideRight')
      const sideRightFloatingBoundary =
        document.getElementById('sideRightSticky') ||
        document.getElementById('sideRightCatalog')

      if (sideRight && window.getComputedStyle(sideRight).display === 'none') {
        setShowOnDesktop(true)
        return
      }

      if (!sideRightFloatingBoundary) {
        setShowOnDesktop(retryCount >= 6)
        retryCount += 1
        retryTimer = window.setTimeout(
          observeSidebarCatalog,
          retryCount > 30 ? 500 : 100
        )
        return
      }

      setShowOnDesktop(false)
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            const entryBottom = entry.boundingClientRect?.bottom || 0
            setShowOnDesktop(!entry.isIntersecting && entryBottom <= 80)
          })
        },
        {
          threshold: 0,
          rootMargin: '-80px 0px 0px 0px'
        }
      )

      observer.observe(sideRightFloatingBoundary)
    }

    observeSidebarCatalog()

    return () => {
      observer?.disconnect()
      if (retryTimer) {
        window.clearTimeout(retryTimer)
      }
    }
  }, [isDesktopTocMode])

  // 当目录隐藏且滚动回右侧栏范围时，关闭目录弹窗
  useEffect(() => {
    if (isDesktopTocMode && !showOnDesktop && tocVisible) {
      changeTocVisible(false)
    }
  }, [isDesktopTocMode, showOnDesktop, tocVisible])

  useEffect(() => {
    if (isDesktopTocMode && toc.length > 0 && !hasServerToc) {
      setShowOnDesktop(true)
    }
  }, [isDesktopTocMode, toc.length, hasServerToc])

  if (!post || lock || toc.length < 1) {
    return <></>
  }

  const showMobileControls = !isDesktopTocMode
  const showDesktopFloatingToc = isDesktopTocMode && showOnDesktop
  const mobileActionStyle = {
    right: buttonPos.x !== null ? buttonPos.x + 'px' : undefined,
    bottom:
      buttonPos.y !== null
        ? buttonPos.y + 'px'
        : 'calc(5rem + env(safe-area-inset-bottom))'
  }

  return (
    <>
      {/* 移动端始终显示 */}
      {showMobileControls && showMobileActions && !tocVisible && (
        <div
          id='heo-mobile-floating-actions'
          style={mobileActionStyle}
          className='fixed bottom-20 z-50 right-4 flex flex-col gap-3 items-end'
          onTouchStart={handleButtonTouchStart}
          onTouchMove={handleButtonTouchMove}>
          {/* 按钮 */}
          <div
            onClick={toggleToc}
            className={`${isExpandedButton ? 'w-auto pl-4 pr-3 justify-start rounded-2xl' : 'w-11 h-11 justify-center rounded-full'} border border-gray-200 dark:border-gray-600 shadow-lg transition-all duration-300 select-none hover:scale-110 transform text-black dark:text-gray-200 bg-white flex items-center dark:bg-hexo-black-gray py-2 touch-none`}>
            <button
              id='toc-button'
              type='button'
              aria-label='打开目录导航'
              className={
                'fa-list-ol cursor-pointer fas w-7 h-7 flex items-center justify-center shrink-0'
              }>
              <span className='sr-only'>目录导航</span>
            </button>
            {isExpandedButton && (
              <span className='font-bold ml-1 whitespace-nowrap'>目录导航</span>
            )}
          </div>
          <JumpToCommentButtonMobile isExpandedButton={isExpandedButton} />
        </div>
      )}

      {/* 目录弹窗 - 底部抽屉样式，打开时再挂载目录内容 */}
      {showMobileControls && tocVisible && (
        <div className='fixed inset-0 z-[60] visible'>
          <div
            className='absolute inset-0 bg-black/50 transition-opacity duration-300 opacity-100'
            onClick={toggleToc}
          />
          <div
            id='toc-drawer'
            style={{ height: drawerHeight }}
            className='absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1e1e1e] rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out overflow-hidden flex flex-col translate-y-0'>
            <div
              className='flex justify-center pt-3 pb-3 shrink-0 cursor-grab active:cursor-grabbing touch-none'
              onTouchStart={handleDrawerTouchStart}
              onTouchMove={handleDrawerTouchMove}
              onTouchEnd={handleDrawerTouchEnd}
              onMouseDown={handleDrawerMouseDownV2}>
              <div className='w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full' />
            </div>
            <div className='flex items-center justify-between px-5 py-2 shrink-0'>
              <div className='flex items-center gap-2 font-bold text-lg text-black dark:text-white'>
                <i className='fa-list-ol fas text-indigo-600 dark:text-yellow-500' />
                <span>目录导航</span>
              </div>
              <button
                onClick={toggleToc}
                className='w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors'
                aria-label='关闭目录导航'>
                <i className='fas fa-times' />
              </button>
            </div>

            <div className='flex-1 px-5 overflow-hidden'>
              <Catalog
                className='!max-h-none h-full'
                toc={toc}
                onActiveSectionChange={setActiveSectionId}
                onItemClick={() => changeTocVisible(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 桌面端：滚动超过右侧边栏目录后显示悬浮目录框 */}
      {showDesktopFloatingToc && (
        <div
          id='float-toc-button'
          className='fixed z-50'
          style={{ right: `${desktopPos.x}px`, bottom: `${desktopPos.y}px` }}>
          <div
            className='w-72 flex flex-col gap-3 select-none'
            onMouseDown={handleDesktopMouseDown}>
            {/* 悬浮目录框 */}
            <div
              onClick={toggleToc}
              className={`text-sm block p-4 cursor-pointer bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200 ${tocVisible ? '' : 'h-28'}`}>
              <div className='flex items-center justify-between mb-2 text-indigo-600 dark:text-yellow-500 font-bold'>
                <div className='flex items-center gap-2'>
                  <i className='fa-list-ol fas' />
                  <span>目录导航</span>
                </div>
                <i
                  className={`fas ${tocVisible ? 'fa-chevron-down' : 'fa-chevron-up'} text-xs`}
                />
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ${tocVisible ? 'max-h-[50vh] opacity-100' : 'max-h-12 opacity-80'}`}>
                {tocVisible && (
                  <div className='block dark:text-gray-300 text-gray-600 overflow-y-auto max-h-[50vh]'>
                    <Catalog
                      toc={toc}
                      onActiveSectionChange={setActiveSectionId}
                      forceSpy={true}
                    />
                  </div>
                )}

                {!tocVisible && (
                  <div className='h-12 flex items-center justify-center font-bold truncate px-4 text-indigo-600 dark:text-yellow-500'>
                    {(activeSectionId &&
                      toc.find(t => uuidToId(t.id || '') === activeSectionId)
                        ?.text) ||
                      '目录'}
                  </div>
                )}
              </div>

              {!tocVisible && (
                <div className='text-xs text-gray-400 mt-2 text-center truncate px-2'>
                  点击展开目录
                </div>
              )}
            </div>

            {/* 跳转评论按钮 - 独立卡片 */}
            {!tocVisible && <JumpToCommentButtonDesktop />}
          </div>
        </div>
      )}
    </>
  )
}

const JumpToCommentButtonDesktop = () => {
  const [showToast, setShowToast] = useState(false)
  const [savedScrollY, setSavedScrollY] = useState(0)

  const handleJump = e => {
    e.stopPropagation()
    setSavedScrollY(window.scrollY)
    const commentNode = document.getElementById('post-comments')
    if (commentNode) {
      const headerHeight = 80
      const elementPosition =
        commentNode.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - headerHeight
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      setTimeout(() => {
        const elementPosition2 =
          commentNode.getBoundingClientRect().top + window.scrollY
        const offsetPosition2 = elementPosition2 - headerHeight
        window.scrollTo({
          top: offsetPosition2,
          behavior: 'smooth'
        })
      }, 500)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const handleBack = () => {
    window.scrollTo({ top: savedScrollY, behavior: 'smooth' })
    setShowToast(false)
  }

  return (
    <>
      <div
        className='text-sm p-3 text-center cursor-pointer bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:text-indigo-600 dark:hover:text-yellow-500 dark:text-gray-200 transition-all duration-200 select-none'
        onClick={handleJump}>
        <i className='fas fa-comments mr-2' />
        跳转评论
      </div>

      {showToast &&
        createPortal(
          <div className='fixed bottom-20 md:bottom-10 left-0 right-0 mx-auto w-fit max-w-md z-[99] animate-fade-in'>
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
                  <span className='truncate'>评论区</span>
                </div>
              </div>
              <div className='flex items-center gap-2 shrink-0 self-start mt-0.5'>
                <button
                  onClick={handleBack}
                  className='px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap'>
                  回到原位置
                </button>
                <button
                  onClick={() => setShowToast(false)}
                  className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'>
                  <svg
                    className='w-5 h-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
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
          </div>,
          document.body
        )}
    </>
  )
}

const JumpToCommentButtonMobile = ({ isExpandedButton }) => {
  const [showToast, setShowToast] = useState(false)
  const [savedScrollY, setSavedScrollY] = useState(0)

  const handleJump = () => {
    setSavedScrollY(window.scrollY)
    const commentNode = document.getElementById('post-comments')
    if (commentNode) {
      const headerHeight = 80 // approximate header height
      const elementPosition =
        commentNode.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - headerHeight

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      setTimeout(() => {
        const elementPosition2 =
          commentNode.getBoundingClientRect().top + window.scrollY
        const offsetPosition2 = elementPosition2 - headerHeight
        window.scrollTo({
          top: offsetPosition2,
          behavior: 'smooth'
        })
      }, 500)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const handleBack = () => {
    window.scrollTo({ top: savedScrollY, behavior: 'smooth' })
    setShowToast(false)
  }

  return (
    <>
      <div
        onClick={handleJump}
        className={`${isExpandedButton ? 'w-auto pl-4 pr-3 justify-start rounded-2xl' : 'w-11 h-11 justify-center rounded-full'} border border-gray-200 dark:border-gray-600 shadow-lg transition-all duration-300 select-none hover:scale-110 transform text-black dark:text-gray-200 bg-white flex items-center dark:bg-hexo-black-gray py-2 touch-none cursor-pointer`}>
        <button
          type='button'
          aria-label='跳转评论'
          className={
            'fas fa-comments cursor-pointer w-7 h-7 flex items-center justify-center shrink-0'
          }
        />
        {isExpandedButton && (
          <span className='font-bold ml-1 whitespace-nowrap'>跳转评论</span>
        )}
      </div>

      {showToast &&
        createPortal(
          <div className='fixed bottom-20 md:bottom-10 left-0 right-0 mx-auto w-fit max-w-md z-[99] animate-fade-in'>
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
                  <span className='truncate'>评论区</span>
                </div>
              </div>
              <div className='flex items-center gap-2 shrink-0 self-start mt-0.5'>
                <button
                  onClick={handleBack}
                  className='px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap'>
                  回到原位置
                </button>
                <button
                  onClick={() => setShowToast(false)}
                  className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'>
                  <svg
                    className='w-5 h-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
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
          </div>,
          document.body
        )}
    </>
  )
}
