import { useState, useEffect, useMemo, useRef } from 'react'
import Catalog from './Catalog'
import throttle from 'lodash.throttle'
import { uuidToId } from 'notion-utils'

// 滚动偏移量常量 - 目录滚动超过此值后显示悬浮按钮
const SCROLL_OFFSET = 100

/**
 * 悬浮目录按钮
 * 移动端始终显示，桌面端滚动超过右侧边栏目录时显示
 */
export default function FloatTocButton(props) {
  const [tocVisible, changeTocVisible] = useState(false)
  const [showOnDesktop, setShowOnDesktop] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState(null)

  // 移动端按钮展开状态
  const [isExpandedButton, setIsExpandedButton] = useState(true)
  // 移动端按钮位置偏移 {x: right, y: bottom}
  const [buttonPos, setButtonPos] = useState({ x: null, y: null })
  // 移动端抽屉高度
  const [drawerHeight, setDrawerHeight] = useState('30vh')
  const [touchStartY, setTouchStartY] = useState(null)
  const [touchStartHeight, setTouchStartHeight] = useState(null)
  const [touchStartButton, setTouchStartButton] = useState({ x: 0, y: 0 })

  // 桌面端拖拽状态
  const [desktopPos, setDesktopPos] = useState({ x: 16, y: 80 }) // default right-4 (16px), bottom-20 (80px) moved up
  const [isDraggingDesktop, setIsDraggingDesktop] = useState(false)
  const [dragStartDesktop, setDragStartDesktop] = useState({ x: 0, y: 0 })
  const [initialDragPos, setInitialDragPos] = useState({ x: 0, y: 0 })
  const isMouseDownRef = useRef(false)

  const { post } = props

  const toggleToc = () => {
    // 如果正在拖拽，不触发点击
    if (isDraggingDesktop) return
    changeTocVisible(!tocVisible)
  }

  // 初始加载6秒后收缩移动端按钮
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpandedButton(false)
    }, 6000)
    return () => clearTimeout(timer)
  }, [])

  // 移动端拖动按钮逻辑
  const handleButtonTouchStart = (e) => {
    e.stopPropagation()
    const touch = e.touches[0]
    setTouchStartButton({
      x: touch.clientX,
      y: touch.clientY,
      initialRight: buttonPos.x || 0, // default right-0 = 0px (初始不留空)
      initialBottom: buttonPos.y || 320 // default bottom-80 = 320px (moved up)
    })
  }

  const handleButtonTouchMove = (e) => {
    e.stopPropagation()
    e.preventDefault() // 防止页面滚动
    const touch = e.touches[0]
    const deltaX = touchStartButton.x - touch.clientX // 向左滑，right增加
    const deltaY = touchStartButton.y - touch.clientY // 向上滑，bottom增加

    // 计算新位置
    let newRight = touchStartButton.initialRight + deltaX
    let newBottom = touchStartButton.initialBottom + deltaY

    // 边界检查
    const maxRight = window.innerWidth - 44 // 假设按钮宽度约 44px
    const maxBottom = window.innerHeight - 44 // 假设按钮高度约 44px

    newRight = Math.max(0, Math.min(newRight, maxRight))
    newBottom = Math.max(0, Math.min(newBottom, maxBottom))

    setButtonPos({
      x: newRight,
      y: newBottom
    })
  }

  // 桌面端拖拽逻辑
  const handleDesktopMouseDown = (e) => {
    // e.preventDefault() // 允许点击事件穿透
    isMouseDownRef.current = true
    setDragStartDesktop({ x: e.clientX, y: e.clientY })
    setInitialDragPos({ x: desktopPos.x, y: desktopPos.y })
  }

  const handleDesktopMouseMove = (e) => {
    if (!isMouseDownRef.current) return

    const deltaX = dragStartDesktop.x - e.clientX // 向左移动，right增加
    const deltaY = dragStartDesktop.y - e.clientY // 向上移动，bottom增加

    // 移动距离检查，防止微小抖动误判为拖拽
    if (!isDraggingDesktop) {
        if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return
        setIsDraggingDesktop(true)
    }

    e.preventDefault() // 拖拽开始后阻止默认行为

    let newX = initialDragPos.x + deltaX
    let newY = initialDragPos.y + deltaY

    // 边界检查 (假设容器宽度约 300px，高度视展开情况而定，这里简单限制在窗口内)
    const maxRight = window.innerWidth - 300
    const maxBottom = window.innerHeight - 100

    newX = Math.max(0, Math.min(newX, maxRight))
    newY = Math.max(0, Math.min(newY, maxBottom))

    setDesktopPos({ x: newX, y: newY })
  }

  const handleDesktopMouseUp = () => {
    isMouseDownRef.current = false
    // 延迟一点设置 dragging 为 false，防止触发 click 事件
    setTimeout(() => {
      setIsDraggingDesktop(false)
    }, 0)
  }

  useEffect(() => {
    if (isDraggingDesktop) {
      window.addEventListener('mousemove', handleDesktopMouseMove)
      window.addEventListener('mouseup', handleDesktopMouseUp)
    } else {
      window.removeEventListener('mousemove', handleDesktopMouseMove)
      window.removeEventListener('mouseup', handleDesktopMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleDesktopMouseMove)
      window.removeEventListener('mouseup', handleDesktopMouseUp)
    }
  }, [isDraggingDesktop])

  // 移动端抽屉高度调整逻辑
  const handleDrawerTouchStart = (e) => {
    const touch = e.touches[0]
    setTouchStartY(touch.clientY)
    const currentHeight = document.getElementById('toc-drawer').clientHeight
    setTouchStartHeight(currentHeight)
  }

  const handleDrawerTouchMove = (e) => {
    if (!touchStartY) return
    const touch = e.touches[0]
    const deltaY = touchStartY - touch.clientY // 向上滑为正，高度增加
    const newHeight = touchStartHeight + deltaY
    const vh = (newHeight / window.innerHeight) * 100
    // 限制高度在 30vh 到 85vh 之间
    if (vh >= 25 && vh <= 90) {
      setDrawerHeight(`${vh}vh`)
    }
  }

  const handleDrawerTouchEnd = () => {
    setTouchStartY(null)
    setTouchStartHeight(null)
  }

  // 监听滚动，检测是否超过右侧边栏目录 - 使用 useMemo 来记忆化 throttle 函数
  const checkScrollPosition = useMemo(
    () =>
      throttle(() => {
        // 移动端直接不显示桌面悬浮按钮，减少DOM操作
        if (window.innerWidth < 1280) {
          setShowOnDesktop(false)
          return
        }

        // 首先检测右侧边栏是否存在（xl屏幕以上才显示）
        const sideRight = document.getElementById('sideRight')
        
        // 如果右侧边栏不存在或不可见，说明宽度不够，此时需要显示悬浮按钮
        if (!sideRight || (sideRight && (sideRight.offsetParent === null || window.getComputedStyle(sideRight).display === 'none'))) {
          setShowOnDesktop(true)
          return
        }

        const rect = sideRight.getBoundingClientRect()
        // 当右侧栏的粘性区域滚动到视口顶部以上时（整个目录不可见），显示悬浮按钮
        const isScrolledPast = rect.bottom < SCROLL_OFFSET
        setShowOnDesktop(isScrolledPast)
      }, 500),
    []
  )

  const [hasNextPost, setHasNextPost] = useState(false)
  const checkNextPost = useMemo(
    () =>
      throttle(() => {
        const nextPost = document.getElementById('pc-next-post')
        if (nextPost) {
          const isVisible = window.getComputedStyle(nextPost).opacity === '1'
          setHasNextPost(isVisible)
        }
      }, 500),
    []
  )

  useEffect(() => {
    window.addEventListener('scroll', checkScrollPosition, { passive: true })
    window.addEventListener('resize', checkScrollPosition, { passive: true })
    window.addEventListener('scroll', checkNextPost, { passive: true })
    checkScrollPosition()
    checkNextPost()
    return () => {
      window.removeEventListener('scroll', checkScrollPosition)
      window.removeEventListener('resize', checkScrollPosition)
      window.removeEventListener('scroll', checkNextPost)
    }
  }, [checkScrollPosition, checkNextPost])

  // 当目录隐藏且滚动回右侧栏范围时，关闭目录弹窗
  useEffect(() => {
    if (window.innerWidth >= 1280 && !showOnDesktop && tocVisible) {
      changeTocVisible(false)
    }
  }, [showOnDesktop, tocVisible])

  //   没有目录就隐藏该按钮
  if (!post || !post.toc || post.toc.length < 1) {
    return <></>
  }

  return (<>
    {/* 移动端始终显示 */}
    <div
      style={{
        right: buttonPos.x !== null ? `${buttonPos.x}px` : undefined,
        bottom: buttonPos.y !== null ? `${buttonPos.y}px` : undefined
      }}
      className={`fixed xl:hidden bottom-80 z-50 ${buttonPos.x === null ? 'right-0' : 'right-4'}`}
      onTouchStart={handleButtonTouchStart}
      onTouchMove={handleButtonTouchMove}
    >
      {/* 按钮 */}
      <div
        onClick={toggleToc}
        className={`${isExpandedButton ? 'w-auto pl-4 pr-3 justify-start rounded-2xl' : 'w-11 h-11 justify-center rounded-full'} border border-gray-200 dark:border-gray-600 shadow-lg transition-all duration-300 select-none hover:scale-110 transform text-black dark:text-gray-200 bg-white flex items-center dark:bg-hexo-black-gray py-2 touch-none`}>
        <button id="toc-button" className={'fa-list-ol cursor-pointer fas w-7 h-7 flex items-center justify-center shrink-0'} />
        {isExpandedButton && <span className='font-bold ml-1 whitespace-nowrap'>目录导航</span>}
      </div>
    </div>

    {/* 移动端跳转评论按钮 - 位于浮动目录按钮下方 */}
    <div
      className={`fixed xl:hidden z-50 ${buttonPos.x === null ? 'right-0' : 'right-4'}`}
      style={{
        right: buttonPos.x !== null ? `${buttonPos.x}px` : undefined,
        bottom: buttonPos.y !== null ? `${buttonPos.y - 60}px` : '260px' // 位于目录按钮下方约60px (320 - 60 = 260)
      }}
    >
        <JumpToCommentButtonMobile isExpandedButton={isExpandedButton} />
    </div>

    {/* 移动端目录弹窗 - 底部抽屉样式 */}
    <div className={`fixed inset-0 z-[60] xl:hidden ${tocVisible ? 'visible' : 'invisible pointer-events-none'}`}>
      {/* 背景蒙版 */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${tocVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={toggleToc}
      />
      {/* 底部目录抽屉 */}
      <div
        id="toc-drawer"
        style={{ height: drawerHeight }}
        className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1e1e1e] rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out overflow-hidden flex flex-col ${tocVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* 顶部拖动条 */}
        <div
          className='flex justify-center pt-3 pb-3 shrink-0 cursor-grab active:cursor-grabbing touch-none'
          onTouchStart={handleDrawerTouchStart}
          onTouchMove={handleDrawerTouchMove}
          onTouchEnd={handleDrawerTouchEnd}
        >
          <div className='w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full' />
        </div>
        {/* 头部 */}
        <div className='flex items-center justify-between px-5 py-2 shrink-0'>
            <div className='flex items-center gap-2 font-bold text-lg text-black dark:text-white'>
                <i className='fa-list-ol fas text-indigo-600 dark:text-yellow-500' />
                <span>目录导航</span>
            </div>
            <button onClick={toggleToc} className='p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors'>
                <i className='fas fa-times' />
            </button>
        </div>

        {/* 内容 */}
        <div className='flex-1 px-5 overflow-y-auto overscroll-contain'>
            <Catalog className='!max-h-none h-full' toc={post.toc} onActiveSectionChange={setActiveSectionId} onItemClick={() => changeTocVisible(false)} />
        </div>
      </div>
    </div>

    {/* 桌面端：滚动超过右侧边栏目录后显示悬浮目录框 */}
    {showOnDesktop && (
      <div
        id="float-toc-button"
        className='hidden xl:block fixed z-50'
        style={{ right: `${desktopPos.x}px`, bottom: `${desktopPos.y}px` }}
      >
        <div
          className='w-72 flex flex-col gap-3 select-none'
          onMouseDown={handleDesktopMouseDown}
        >
          {/* 悬浮目录框 */}
          <div
            onClick={toggleToc}
            className={`text-sm block p-4 cursor-pointer bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200 ${tocVisible ? '' : 'h-28'}`}>
            {/* 标题栏 */}
            <div className='flex items-center justify-between mb-2 text-indigo-600 dark:text-yellow-500 font-bold'>
              <div className='flex items-center gap-2'>
                <i className='fa-list-ol fas' />
                <span>目录导航</span>
              </div>
              <i className={`fas ${tocVisible ? 'fa-chevron-down' : 'fa-chevron-up'} text-xs`} />
            </div>

            {/* 目录内容 */}
            <div className={`overflow-hidden transition-all duration-300 ${tocVisible ? 'max-h-[50vh] opacity-100' : 'max-h-12 opacity-80'}`}>
              <div className={`${tocVisible ? 'block' : 'hidden'} dark:text-gray-300 text-gray-600 overflow-y-auto max-h-[50vh]`}>
                <Catalog toc={post.toc} onActiveSectionChange={setActiveSectionId} />
              </div>

              {!tocVisible && (
                <div className="h-12 flex items-center justify-center font-bold truncate px-4 text-indigo-600 dark:text-yellow-500">
                  {activeSectionId && post.toc?.find(t => uuidToId(t.id) === activeSectionId)?.text || '目录'}
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
          {!tocVisible && (
             <JumpToCommentButtonDesktop />
          )}
        </div>
      </div>
    )}
  </>)
}

const JumpToCommentButtonDesktop = () => {
  const [showToast, setShowToast] = useState(false)
  const [savedScrollY, setSavedScrollY] = useState(0)

  const handleJump = (e) => {
    e.stopPropagation()
    setSavedScrollY(window.scrollY)
    const commentNode = document.getElementById('comment')
    if (commentNode) {
      const headerHeight = 80
      const elementPosition = commentNode.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - headerHeight
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
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
        onClick={handleJump}
      >
        <i className='fas fa-comments mr-2'/>跳转评论
      </div>

      {showToast && (
        <div className='fixed bottom-20 md:bottom-10 left-0 right-0 mx-auto w-fit max-w-md z-[70] animate-fade-in'>
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
      )}
    </>
  )
}

const JumpToCommentButtonMobile = ({ isExpandedButton }) => {
  const [showToast, setShowToast] = useState(false)
  const [savedScrollY, setSavedScrollY] = useState(0)

  const handleJump = () => {
    setSavedScrollY(window.scrollY)
    const commentNode = document.getElementById('comment')
    if (commentNode) {
      const headerHeight = 80 // approximate header height
      const elementPosition = commentNode.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - headerHeight

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
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
        <button className={'fas fa-comments cursor-pointer w-7 h-7 flex items-center justify-center shrink-0'} />
        {isExpandedButton && <span className='font-bold ml-1 whitespace-nowrap'>跳转评论</span>}
      </div>

      {showToast && (
        <div className='fixed bottom-20 md:bottom-10 left-0 right-0 mx-auto w-fit max-w-md z-[70] animate-fade-in'>
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
      )}
    </>
  )
}
