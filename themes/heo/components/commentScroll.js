const COMMENT_SCROLL_OFFSET = 80
const SETTLE_INTERVAL_MS = 150
const SETTLE_MAX_TICKS = 10
const SETTLE_STABLE_TICKS = 2

let settleTimer = null
let removeSettleCancelListeners = null

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

function stopSettle() {
  if (settleTimer) {
    clearInterval(settleTimer)
    settleTimer = null
  }
  if (removeSettleCancelListeners) {
    removeSettleCancelListeners()
    removeSettleCancelListeners = null
  }
}

export function scrollToHeoComment() {
  const top = getHeoCommentScrollTop()
  if (top === null) {
    return false
  }

  stopSettle()

  // 瞬时直达。smooth 动画期间懒加载区块（分享栏/推荐文章/评论组件）陆续挂载
  // 改变布局，动画会一段一段追着新位置滚，表现为“跳很多次”；瞬时跳转 + 瞬时
  // 校正在用户眼里就是一次到位。
  window.scrollTo({ top, behavior: 'instant' })

  // 用户一旦主动滚动，立即放弃校正，不与用户抢滚动条
  const cancelEvents = ['wheel', 'touchstart', 'keydown']
  const onUserInteract = () => stopSettle()
  cancelEvents.forEach(eventName =>
    window.addEventListener(eventName, onUserInteract, { passive: true })
  )
  removeSettleCancelListeners = () =>
    cancelEvents.forEach(eventName =>
      window.removeEventListener(eventName, onUserInteract)
    )

  let ticks = 0
  let stableTicks = 0
  settleTimer = setInterval(() => {
    ticks += 1
    const nextTop = getHeoCommentScrollTop()

    if (nextTop === null || ticks >= SETTLE_MAX_TICKS) {
      stopSettle()
      return
    }

    if (Math.abs(window.scrollY - nextTop) > 2) {
      stableTicks = 0
      window.scrollTo({ top: nextTop, behavior: 'instant' })
      return
    }

    stableTicks += 1
    if (stableTicks >= SETTLE_STABLE_TICKS) {
      stopSettle()
    }
  }, SETTLE_INTERVAL_MS)

  return true
}
