const COMMENT_SCROLL_OFFSET = 80
const SETTLE_INTERVAL_MS = 400
const SETTLE_MAX_TICKS = 8

let settleTimer = null

export function getHeoCommentAnchor() {
  if (typeof document === 'undefined') {
    return null
  }

  return (
    // HEO mounts #comment inside a temporarily hidden lazy-loading wrapper.
    // Measure the always-laid-out theme anchor first so a zero-sized hidden
    // comment node cannot turn the jump into an upward 80px scroll.
    document.getElementById('post-comments') ||
    document.getElementById('comment')
  )
}

export function getHeoCommentScrollTop() {
  if (typeof window === 'undefined') {
    return null
  }

  const commentNode = getHeoCommentAnchor()
  if (!commentNode) {
    return null
  }

  const top =
    commentNode.getBoundingClientRect().top +
    window.scrollY -
    COMMENT_SCROLL_OFFSET

  return Math.max(0, top)
}

export function scrollToHeoComment() {
  const top = getHeoCommentScrollTop()
  if (top === null) {
    return false
  }

  window.scrollTo({ top, behavior: 'smooth' })

  // 滚动途中，评论区上方的懒加载区块（分享栏/推荐文章/评论组件）陆续挂载，
  // 会把锚点持续往下推；周期性重算目标并校正，直到目标稳定且已到位。
  if (settleTimer) {
    clearInterval(settleTimer)
  }
  let lastTop = top
  let ticks = 0
  settleTimer = setInterval(() => {
    ticks += 1
    const nextTop = getHeoCommentScrollTop()

    if (nextTop === null || ticks >= SETTLE_MAX_TICKS) {
      clearInterval(settleTimer)
      settleTimer = null
      return
    }

    if (Math.abs(nextTop - lastTop) > 2) {
      lastTop = nextTop
      window.scrollTo({ top: nextTop, behavior: 'smooth' })
      return
    }

    // 目标稳定且已滚到附近才收工；未到位说明 smooth 滚动仍在进行
    // （或用户手动打断——此时目标不再变化，不会再抢滚，只会静默超时）
    if (Math.abs(window.scrollY - nextTop) < 4) {
      clearInterval(settleTimer)
      settleTimer = null
    }
  }, SETTLE_INTERVAL_MS)

  return true
}
