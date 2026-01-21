import CONFIG from '../config'
import { siteConfig } from '@/lib/config'

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
    const commentElement = document.getElementById('post-comments')
    if (commentElement) {
      // 这里的 80 是顶部导航栏的高度，可以根据实际情况调整
      const top = commentElement.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (<div className='flex space-x-1 items-center justify-center transform hover:scale-105 duration-200 w-7 h-7 text-center cursor-pointer' onClick={navToComment} >
    <i className='fas fa-comment text-xs' />
  </div>)
}

export default JumpToCommentButton
