import { ArrowSmallUp } from '@/components/HeroIcons'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * 回顶按钮
 * @returns
 */
export default function ReadingProgress({ title }) {
  const [scrollPercentage, setScrollPercentage] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [savedScrollY, setSavedScrollY] = useState(0)

  function handleScroll() {
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = document.documentElement.clientHeight
    const scrollY = window.scrollY || window.pageYOffset

    const percent = Math.floor((scrollY / (scrollHeight - clientHeight - 20)) * 100)
    setScrollPercentage(percent)
  }

  // 监听滚动事件
  useEffect(() => {
    let requestId

    function updateScrollPercentage() {
      handleScroll()
      requestId = null
    }

    function handleAnimationFrame() {
      if (requestId) {
        return
      }
      requestId = requestAnimationFrame(updateScrollPercentage)
    }

    window.addEventListener('scroll', handleAnimationFrame)
    return () => {
      window.removeEventListener('scroll', handleAnimationFrame)
      if (requestId) {
        cancelAnimationFrame(requestId)
      }
    }
  }, [])

  const handleScrollTop = () => {
    setSavedScrollY(window.scrollY)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleBack = (e) => {
    e.stopPropagation()
    window.scrollTo({ top: savedScrollY, behavior: 'smooth' })
    setShowToast(false)
  }

  return (
    <>
      <div
        title={'阅读进度'}
        onClick={handleScrollTop}
        className={`${scrollPercentage > 0 ? 'w-10 h-10 ' : 'w-0 h-0 opacity-0'} group cursor-pointer  hover:bg-black hover:bg-opacity-10 rounded-full flex justify-center items-center duration-200 transition-all`}
    >
        <ArrowSmallUp className={'w-5 h-5 hidden group-hover:block'} />
        <div className='group-hover:hidden text-xs flex justify-center items-center rounded-full w-6 h-6 bg-black text-white'>
            {scrollPercentage < 100 ? scrollPercentage : <ArrowSmallUp className={'w-5 h-5 fill-white'} />}
        </div>
      </div>

      {showToast && createPortal(
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
                <span className='truncate'>{title}</span>
              </div>
            </div>
            <div className='flex items-center gap-2 shrink-0 self-start mt-0.5'>
              <button
                onClick={handleBack}
                className='px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap'>
                回到原位置
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowToast(false); }}
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
    </>
  )
}
