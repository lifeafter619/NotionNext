const COMMENT_SCROLL_OFFSET = 80

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
  return true
}
