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

  const { post } = props

  const toggleToc = () => {
    changeTocVisible(!tocVisible)
  }

  // 监听滚动，检测是否超过右侧边栏目录 - 使用 useMemo 来记忆化 throttle 函数
  const checkScrollPosition = useMemo(
    () =>
      throttle(() => {
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
      }, 100),
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
    if (!showOnDesktop && tocVisible) {
      changeTocVisible(false)
    }
  }, [showOnDesktop, tocVisible])

  //   没有目录就隐藏该按钮
  if (!post || !post.toc || post.toc.length < 1) {
    return <></>
  }

  return (<>
    {/* 移动端始终显示 */}
    <div className='fixed xl:hidden right-4 bottom-24 z-50'>
        {/* 按钮 */}
        <div onClick={toggleToc} className={'w-11 h-11 select-none hover:scale-110 transform duration-200 text-black dark:text-gray-200 rounded-full bg-white drop-shadow-lg flex justify-center items-center dark:bg-hexo-black-gray py-2 px-2'}>
            <button id="toc-button" className={'fa-list-ol cursor-pointer fas'} />
        </div>

        {/* 目录Modal */}
        <div className='fixed top-0 right-0 z-40 '>
            {/* 侧边菜单 */}
            <div
                className={`${tocVisible ? 'shadow-card ' : ' -mr-72  opacity-0'} dark:bg-black w-60 duration-200 fixed right-4 bottom-12 rounded-xl py-2 bg-white dark:bg-gray-900'`}>
                {post && <>
                    <div className='dark:text-gray-400 text-gray-600'>
                        <Catalog toc={post.toc} />
                    </div>
                </>
                }
            </div>
        </div>
        {/* 背景蒙版 */}
        <div id='right-drawer-background' className={(tocVisible ? 'block' : 'hidden') + ' fixed top-0 left-0 z-30 w-full h-full'}
            onClick={toggleToc} />
    </div>

    {/* 桌面端：滚动超过右侧边栏目录后显示悬浮目录框 */}
    {showOnDesktop && (
      <div className={`hidden xl:block fixed right-4 z-50 duration-200 transition-all ${hasNextPost ? 'bottom-36' : 'bottom-4'}`}>
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
            <div className={`dark:text-gray-300 text-gray-600 overflow-y-auto ${tocVisible ? 'max-h-[50vh]' : 'max-h-12'}`}>
              <Catalog toc={post.toc} onActiveSectionChange={setActiveSectionId} />
            </div>
          </div>

          {/* 提示文字 */}
          {!tocVisible && (
            <div className='text-xs text-gray-400 mt-2 text-center truncate px-2'>
              {activeSectionId &&
                post.toc?.find(t => uuidToId(t.id) === activeSectionId)?.text}
              {!activeSectionId && post.toc.length > 3 && '点击展开完整目录'}
            </div>
          )}
        </div>
      </div>
    )}
  </>)
}
