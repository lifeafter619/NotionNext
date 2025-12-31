import { useState, useEffect, useMemo } from 'react'
import Catalog from './Catalog'
import throttle from 'lodash.throttle'

/**
 * 悬浮目录按钮
 * 移动端始终显示，桌面端滚动超过右侧边栏时显示
 */
export default function FloatTocButton(props) {
  const [tocVisible, changeTocVisible] = useState(false)
  const [showOnDesktop, setShowOnDesktop] = useState(false)

  const { post } = props

  const toggleToc = () => {
    changeTocVisible(!tocVisible)
  }

  // 监听滚动，检测是否超过右侧边栏 - 使用 useMemo 来记忆化 throttle 函数
  const checkScrollPosition = useMemo(
    () =>
      throttle(() => {
        const sideRight = document.getElementById('sideRight')
        if (sideRight) {
          const rect = sideRight.getBoundingClientRect()
          // 当右侧栏底部滚动到视口顶部以上时，显示悬浮按钮
          setShowOnDesktop(rect.bottom < 0)
        }
      }, 100),
    []
  )

  useEffect(() => {
    window.addEventListener('scroll', checkScrollPosition, { passive: true })
    checkScrollPosition()
    return () => {
      window.removeEventListener('scroll', checkScrollPosition)
    }
  }, [checkScrollPosition])

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
    <div className='fixed lg:hidden right-4 bottom-24 z-50'>
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

    {/* 桌面端：滚动超过右侧边栏后显示 */}
    <div className={`hidden lg:block fixed right-8 bottom-24 z-50 transition-all duration-300 ${showOnDesktop ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20 pointer-events-none'}`}>
        {/* 按钮 */}
        <div onClick={toggleToc} className={'w-12 h-12 select-none hover:scale-110 transform duration-200 text-white rounded-full bg-indigo-600 dark:bg-yellow-500 drop-shadow-lg flex justify-center items-center cursor-pointer'}>
            <i className={'fa-list-ol fas text-lg'} />
        </div>

        {/* 目录Modal */}
        <div
            className={`${tocVisible && showOnDesktop ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'} 
            w-72 duration-200 fixed right-8 bottom-40 rounded-xl py-3 px-1 bg-white dark:bg-[#1e1e1e] shadow-lg border dark:border-gray-700 transition-all z-50`}>
            <div className='dark:text-gray-300 text-gray-600 max-h-[60vh] overflow-y-auto'>
                <Catalog toc={post.toc} />
            </div>
        </div>

        {/* 背景蒙版 */}
        {tocVisible && showOnDesktop && (
          <div 
            className='fixed top-0 left-0 z-40 w-full h-full'
            onClick={toggleToc} 
          />
        )}
    </div>
  </>)
}
