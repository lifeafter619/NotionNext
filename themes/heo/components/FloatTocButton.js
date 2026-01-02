import { useState, useEffect, useMemo } from 'react'
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

  const { post } = props

  const toggleToc = () => {
    changeTocVisible(!tocVisible)
  }

  // 初始加载3秒后收缩移动端按钮
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpandedButton(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // 移动端拖动按钮逻辑
  const handleButtonTouchStart = (e) => {
    e.stopPropagation()
    const touch = e.touches[0]
    setTouchStartButton({
      x: touch.clientX,
      y: touch.clientY,
      initialRight: buttonPos.x || 16, // default right-4 = 16px
      initialBottom: buttonPos.y || 96 // default bottom-24 = 96px
    })
  }

  const handleButtonTouchMove = (e) => {
    e.stopPropagation()
    e.preventDefault() // 防止页面滚动
    const touch = e.touches[0]
    const deltaX = touchStartButton.x - touch.clientX // 向左滑，right增加
    const deltaY = touchStartButton.y - touch.clientY // 向上滑，bottom增加

    setButtonPos({
      x: Math.max(16, touchStartButton.initialRight + deltaX), // 保持至少 16px 间距
      y: Math.max(16, touchStartButton.initialBottom + deltaY)
    })
  }

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
        
        // 如果右侧边栏不存在或不可见，不显示悬浮按钮
        if (!sideRight || window.getComputedStyle(sideRight).display === 'none') {
          setShowOnDesktop(false)
          return
        }

        const rect = sideRight.getBoundingClientRect()
        // 当右侧栏的粘性区域滚动到视口顶部以上时（整个目录不可见），显示悬浮按钮
        const isScrolledPast = rect.bottom < SCROLL_OFFSET
        setShowOnDesktop(isScrolledPast)
      }, 200),
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
      }, 200),
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
        right: buttonPos.x ? `${buttonPos.x}px` : undefined,
        bottom: buttonPos.y ? `${buttonPos.y}px` : undefined
      }}
      className='fixed xl:hidden right-4 bottom-24 z-50'
      onTouchStart={handleButtonTouchStart}
      onTouchMove={handleButtonTouchMove}
    >
      {/* 按钮 */}
      <div
        onClick={toggleToc}
        className={`${isExpandedButton ? 'w-48 px-4 justify-start' : 'w-11 h-11 justify-center'} border border-gray-200 dark:border-gray-600 shadow-lg transition-all duration-300 select-none hover:scale-110 transform text-black dark:text-gray-200 rounded-full bg-white flex items-center dark:bg-hexo-black-gray py-2 touch-none`}>
        <button id="toc-button" className={'fa-list-ol cursor-pointer fas w-7 h-7 flex items-center justify-center shrink-0'} />
        {isExpandedButton && <span className='font-bold ml-1 whitespace-nowrap'>目录导航</span>}
      </div>
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
            <Catalog toc={post.toc} onActiveSectionChange={setActiveSectionId} onItemClick={() => changeTocVisible(false)} />
        </div>
      </div>
    </div>

    {/* 桌面端：滚动超过右侧边栏目录后显示悬浮目录框 */}
    {showOnDesktop && (
      <div className={`hidden xl:block fixed ${hasNextPost ? 'right-10 bottom-40' : 'right-4 bottom-4'} z-50 duration-200 transition-all`}>
        {/* 悬浮目录框 - 简洁盒子样式 */}
        <div
          onClick={toggleToc}
          className={`text-sm block p-4 w-72 cursor-pointer bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200 ${tocVisible ? '' : 'h-28'}`}>
          {/* 标题栏 */}
          <div className='flex items-center justify-between mb-2 text-indigo-600 dark:text-yellow-500 font-bold'>
            <div className='flex items-center gap-2'>
              <i className='fa-list-ol fas' />
              <span>目录导航</span>
            </div>
            <i className={`fas ${tocVisible ? 'fa-chevron-down' : 'fa-chevron-up'} text-xs`} />
          </div>

          {/* 目录内容 - 点击展开/收起 */}
          <div className={`overflow-hidden transition-all duration-300 ${tocVisible ? 'max-h-[50vh] opacity-100' : 'max-h-12 opacity-80'}`}>
            {/* 始终挂载 Catalog 以监听滚动，但仅在展开时显示完整列表 */}
            <div className={`${tocVisible ? 'block' : 'hidden'} dark:text-gray-300 text-gray-600 overflow-y-auto max-h-[50vh]`}>
              <Catalog toc={post.toc} onActiveSectionChange={setActiveSectionId} />
            </div>

            {/* 收起时显示当前标题 */}
            {!tocVisible && (
              <div className="h-12 flex items-center justify-center font-bold truncate px-4 text-indigo-600 dark:text-yellow-500">
                 {activeSectionId && post.toc?.find(t => uuidToId(t.id) === activeSectionId)?.text || '目录'}
              </div>
            )}
          </div>

          {/* 提示文字 */}
          {!tocVisible && (
            <div className='text-xs text-gray-400 mt-2 text-center truncate px-2'>
              点击展开目录
            </div>
          )}
        </div>
      </div>
    )}
  </>)
}
