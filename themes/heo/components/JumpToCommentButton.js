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
    // 优先寻找 wl-comment 类（Waline 评论区）
    let commentElement = document.querySelector('.wl-comment')
    
    // 如果找不到 wl-comment，尝试多个可能的评论区元素 ID
    if (!commentElement) {
      const commentIds = ['comment', 'comments', 'comment-area', 'gitalk-container', 'twikoo', 'waline', 'cusdis_thread']
      for (const id of commentIds) {
        commentElement = document.getElementById(id)
        if (commentElement) break
      }
    }
    
    // 如果还找不到，尝试寻找评论区相关的类名
    if (!commentElement) {
      commentElement = document.querySelector('.comment, .comments, [class*="comment"]')
    }
    
    if (commentElement) {
      // 计算顶部导航栏的高度，避免被遮挡
      const headerHeight = 80
      const elementPosition = commentElement.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - headerHeight
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    } else {
      // 如果找不到评论区，滚动到页面底部
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  return (<div className='flex space-x-1 items-center justify-center transform hover:scale-105 duration-200 w-7 h-7 text-center cursor-pointer' onClick={navToComment} >
    <i className='fas fa-comment text-xs' />
  </div>)
}

export default JumpToCommentButton
