import { useGlobal } from '@/lib/global'
import throttle from 'lodash.throttle'
import { uuidToId } from 'notion-utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * 目录导航组件
 * @param toc
 * @returns {JSX.Element}
 * @constructor
 */
const Catalog = ({ toc, onActiveSectionChange, onItemClick, className, forceSpy }) => {
  const { locale } = useGlobal()
  const [activeSection, setActiveSection] = useState(null)

  // 统一的跳转提示 Toast 状态
  const [toastState, setToastState] = useState({
    show: false,
    message: '',
    savedScrollY: 0
  })

  // 监听滚动事件
  useEffect(() => {
    window.addEventListener('scroll', actionSectionScrollSpy)
    actionSectionScrollSpy()
    return () => {
      window.removeEventListener('scroll', actionSectionScrollSpy)
    }
  }, [])

  // 目录自动滚动
  const tRef = useRef(null)
  const tocIds = []

  const actionSectionScrollSpy = useCallback(
    throttle(() => {
      // 性能优化：如果目录不可见（如在折叠的浮动按钮中），不进行计算
      if (!forceSpy && tRef.current && tRef.current.offsetParent === null) {
        return
      }
      const sections = document.getElementsByClassName('notion-h')
      let prevBBox = null
      let currentSectionId = activeSection
      for (let i = 0; i < sections.length; ++i) {
        const section = sections[i]
        if (!section || !(section instanceof Element)) continue
        if (!currentSectionId) {
          currentSectionId = section.getAttribute('data-id')
        }
        const bbox = section.getBoundingClientRect()
        const prevHeight = prevBBox ? bbox.top - prevBBox.bottom : 0
        const offset = Math.max(150, prevHeight / 4)
        // GetBoundingClientRect returns values relative to viewport
        if (bbox.top - offset < 0) {
          currentSectionId = section.getAttribute('data-id')
          prevBBox = bbox
          continue
        }
        // No need to continue loop, if last element has been detected
        break
      }
      setActiveSection(currentSectionId)
      if (onActiveSectionChange) {
        onActiveSectionChange(currentSectionId)
      }
      const index = tocIds.indexOf(currentSectionId) || 0
      if (tRef?.current) {
        // 让当前阅读的目录项居中显示
        const targetTop = 28 * index - tRef.current.clientHeight / 2 + 14
        tRef.current.scrollTo({ top: targetTop, behavior: 'smooth' })
      }
    }, 500),
    [toc, activeSection, forceSpy]
  )

  // 处理跳转逻辑
  const handleJump = (title, targetScrollY) => {
      const currentScrollY = window.scrollY
      setToastState({
          show: true,
          message: '已跳转至：\n' + title,
          savedScrollY: currentScrollY
      })

      // 3秒后自动关闭
      setTimeout(() => {
          setToastState(prev => ({ ...prev, show: false }))
      }, 3000)

      // 如果有目标位置则滚动
      if (typeof targetScrollY === 'number') {
          window.scrollTo({ top: targetScrollY, behavior: 'smooth' })
      }
      if (onItemClick) {
        onItemClick()
      }
  }

  const handleBack = () => {
      window.scrollTo({ top: toastState.savedScrollY, behavior: 'smooth' })
      setToastState(prev => ({ ...prev, show: false }))
  }

  // 无目录就直接返回空
  if (!toc || toc.length < 1) {
    return <></>
  }

  return (
    <div className='px-3 py-1 dark:text-white text-black flex flex-col h-full'>
      <div className='w-full flex-shrink-0'>
        <i className='mr-1 fas fa-stream' />
        {locale.COMMON.TABLE_OF_CONTENTS}
      </div>
      <div
        className={`${className || ''} overflow-y-auto max-h-36 lg:max-h-96 overscroll-none scroll-hidden flex-1`}
        ref={tRef}>
        <nav className='h-full'>
          {toc?.map(tocItem => {
            const id = uuidToId(tocItem.id)
            tocIds.push(id)
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                    // 记录当前位置用于返回
                    const currentY = window.scrollY
                    setToastState({
                        show: true,
                        message: '已跳转至：\n' + tocItem.text,
                        savedScrollY: currentY
                    })
                    // 3秒后自动关闭
                    setTimeout(() => {
                        setToastState(prev => ({ ...prev, show: false }))
                    }, 3000)

                    if (onItemClick) onItemClick(e)
                }}
                className={`notion-table-of-contents-item duration-300 transform dark:text-gray-200
            notion-table-of-contents-item-indent-level-${tocItem.indentLevel} catalog-item
            ${activeSection === id ? 'bg-indigo-50 dark:bg-yellow-900/40 text-indigo-600 dark:text-yellow-500 border-l-4 border-indigo-600 dark:border-yellow-500' : 'border-l-4 border-transparent'}
            `}>
                <span
                  style={{
                    display: 'inline-block',
                    marginLeft: tocItem.indentLevel * 16
                  }}
                  className={`truncate ${activeSection === id ? 'font-bold' : ''}`}>
                  {tocItem.text}
                </span>
              </a>
            )
          })}
        </nav>
      </div>

      <div className='flex-shrink-0'>
        <JumpToCommentButton onJump={(title, y) => handleJump(title, y)} />
      </div>

      {/* 统一的 Toast 提示框 */}
      {toastState.show && createPortal(
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
                <span className='font-bold whitespace-pre-wrap'>{toastState.message}</span>
              </div>
            </div>
            <div className='flex items-center gap-2 shrink-0 self-start mt-0.5'>
              <button
                onClick={handleBack}
                className='px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap'>
                回到原位置
              </button>
              <button
                onClick={() => setToastState(prev => ({ ...prev, show: false }))}
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
        </div>,
        document.body
      )}
    </div>
  )
}

const JumpToCommentButton = ({ onJump }) => {
  const handleJumpClick = () => {
    const commentNode = document.getElementById('comment')
    if (commentNode) {
      const headerHeight = 80 // approximate header height
      const elementPosition = commentNode.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - headerHeight

      // 调用父组件的跳转处理，传入目标位置
      if (onJump) {
          onJump('评论区', offsetPosition)
      } else {
          // Fallback if no onJump (shouldn't happen in new structure)
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
      }
    }
  }

  return (
    <div
      onClick={handleJumpClick}
      className='mt-4 p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-yellow-500 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 font-bold text-sm text-gray-500 dark:text-gray-200'>
      <i className="fas fa-comments" />
      跳转到评论区
    </div>
  )
}

export default Catalog
