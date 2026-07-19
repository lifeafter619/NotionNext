import CONFIG from '../config'
import { siteConfig } from '@/lib/config'
import { scrollToHeoComment } from './commentScroll'

/**
 * 跳转到评论区
 * @returns {JSX.Element}
 * @constructor
 */
const JumpToCommentButton = () => {
  if (!siteConfig('HEO_WIDGET_TO_COMMENT', null, CONFIG)) {
    return <></>
  }

  function navToComment() {
    if (scrollToHeoComment()) {
      setTimeout(() => {
        scrollToHeoComment()
      }, 500)
    }
  }

  return (
    <button
      type='button'
      aria-label='跳转到评论区'
      className='flex space-x-1 items-center justify-center transform hover:scale-105 duration-200 w-7 h-7 text-center cursor-pointer'
      onClick={navToComment}>
      <i aria-hidden='true' className='fas fa-comment text-xs' />
    </button>
  )
}

export default JumpToCommentButton
