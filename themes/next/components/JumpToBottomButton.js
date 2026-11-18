import { useCallback, useEffect, useRef, useState } from 'react'
import CONFIG from '../config'
import { siteConfig } from '@/lib/config'

/**
 * 跳转到网页底部
 * 当屏幕下滑 100 像素后会出现该控件
 * @param showPercent 是否显示百分比
 * @returns {JSX.Element}
 * @constructor
 */
const JumpToBottomButton = ({ showPercent = false }) => {
  const [show, switchShow] = useState(false)
  const [percent, changePercent] = useState(0)
  const showRef = useRef(show)
  const percentRef = useRef(percent)
  const rafRef = useRef(null)

  useEffect(() => {
    showRef.current = show
  }, [show])

  useEffect(() => {
    percentRef.current = percent
  }, [percent])

  const updateState = useCallback(() => {
    const targetRef = document.getElementById('wrapper')
    const clientHeight = targetRef?.clientHeight
    const fullHeight = clientHeight - window.innerHeight
    if (!targetRef || !fullHeight || fullHeight <= 0) {
      return
    }

    const scrollY = window.pageYOffset
    let per = parseFloat(((scrollY / fullHeight) * 100).toFixed(0))
    if (per > 100) per = 100
    if (per < 0) per = 0
    const shouldShow = scrollY > 100 && per > 0

    if (shouldShow !== showRef.current) {
      showRef.current = shouldShow
      switchShow(shouldShow)
    }
    if (per !== percentRef.current) {
      percentRef.current = per
      changePercent(per)
    }
  }, [changePercent, switchShow])

  const scrollListener = useCallback(() => {
    if (rafRef.current) {
      return
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      updateState()
    })
  }, [updateState])

  useEffect(() => {
    document.addEventListener('scroll', scrollListener, { passive: true })
    updateState()
    return () => {
      document.removeEventListener('scroll', scrollListener)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [scrollListener, updateState])

  function scrollToBottom() {
    const targetRef = document.getElementById('wrapper')
    window.scrollTo({ top: targetRef.clientHeight, behavior: 'smooth' })
  }

  if (!siteConfig('NEXT_WIDGET_TO_BOTTOM', null, CONFIG)) {
    return <></>
  }

  return (
    <div
      className='flex space-x-1 transform hover:scale-105 duration-200 py-2 px-3'
      onClick={scrollToBottom}>
      <div className='dark:text-gray-200'>
        <i className='fas fa-arrow-down' />
      </div>
      {showPercent && (
        <div className='dark:text-gray-200 block lg:hidden'>{percent}%</div>
      )}
    </div>
  )
}

export default JumpToBottomButton
