import { useGlobal } from '@/lib/global'
import throttle from 'lodash.throttle'
import { uuidToId } from 'notion-utils'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 目录导航组件
 * @param toc
 * @returns {JSX.Element}
 * @constructor
 */
const Catalog = ({ toc, onActiveSectionChange, onItemClick, className }) => {
  const { locale } = useGlobal()
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

  // 同步选中目录事件
  const [activeSection, setActiveSection] = useState(null)

  const actionSectionScrollSpy = useCallback(
    throttle(() => {
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
    }, 200),
    [toc, activeSection]
  )

  // 无目录就直接返回空
  if (!toc || toc.length < 1) {
    return <></>
  }

  return (
    <div className='px-3 py-1 dark:text-white text-black'>
      <div className='w-full'>
        <i className='mr-1 fas fa-stream' />
        {locale.COMMON.TABLE_OF_CONTENTS}
      </div>
      <div
        className={`${className || ''} overflow-y-auto max-h-36 lg:max-h-96 overscroll-none scroll-hidden`}
        ref={tRef}>
        <nav className='h-full'>
          {toc?.map(tocItem => {
            const id = uuidToId(tocItem.id)
            tocIds.push(id)
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={onItemClick}
                className={`notion-table-of-contents-item duration-300 transform dark:text-gray-200
            notion-table-of-contents-item-indent-level-${tocItem.indentLevel} catalog-item `}>
                <span
                  style={{
                    display: 'inline-block',
                    marginLeft: tocItem.indentLevel * 16
                  }}
                  className={`truncate ${activeSection === id ? 'font-bold text-indigo-600' : ''}`}>
                  {tocItem.text}
                </span>
              </a>
            )
          })}
        </nav>
      </div>
      <JumpToCommentButton />
    </div>
  )
}

const JumpToCommentButton = () => {
  const [showToast, setShowToast] = useState(false)
  const [savedScrollY, setSavedScrollY] = useState(0)

  const handleJump = () => {
    setSavedScrollY(window.scrollY)
    const commentNode = document.getElementById('comment')
    if (commentNode) {
      commentNode.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
        className='mt-2 cursor-pointer text-center hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-md transition-colors duration-200 text-sm text-gray-500 dark:text-gray-400'>
        跳转到评论区
      </div>

      {showToast && (
        <div className='fixed bottom-20 md:bottom-10 left-1/2 -translate-x-1/2 z-50 w-[90vw] md:w-auto max-w-md animate-fade-in'>
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between gap-3'>
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

export default Catalog
