import { useEffect, useRef } from 'react'

const RESIZE_SETTLE_DELAY = 120
const READING_BLOCK_SELECTOR = [
  '.notion-block',
  '.notion-h',
  '.notion-text',
  '.notion-list',
  '.notion-quote',
  '.notion-callout',
  '.notion-code',
  '.notion-asset-wrapper'
].join(',')

function getViewportWidth() {
  return document.documentElement.clientWidth || window.innerWidth
}

function findReadingAnchor() {
  const article = document.getElementById('notion-article')
  if (!article || window.scrollY <= 0) return null

  const targetY = Math.min(window.innerHeight * 0.35, 320)
  let bestMatch = null

  article.querySelectorAll(READING_BLOCK_SELECTOR).forEach(element => {
    const rect = element.getBoundingClientRect()
    if (rect.height <= 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
      return
    }

    const containsTarget = rect.top <= targetY && rect.bottom >= targetY
    const distance = containsTarget
      ? 0
      : Math.min(Math.abs(rect.top - targetY), Math.abs(rect.bottom - targetY))
    const anchorPoint = Math.min(Math.max(targetY, rect.top), rect.bottom)

    if (
      !bestMatch ||
      distance < bestMatch.distance ||
      (distance === bestMatch.distance && rect.height < bestMatch.height)
    ) {
      bestMatch = {
        element,
        viewportTop: anchorPoint,
        relativeOffset: (anchorPoint - rect.top) / rect.height,
        distance,
        height: rect.height
      }
    }
  })

  return bestMatch
}

function restoreAnchorPosition(anchor) {
  if (!anchor?.element?.isConnected) return

  const nextRect = anchor.element.getBoundingClientRect()
  const nextAnchorPoint = nextRect.top + nextRect.height * anchor.relativeOffset
  const scrollDelta = nextAnchorPoint - anchor.viewportTop
  if (!Number.isFinite(scrollDelta) || Math.abs(scrollDelta) < 1) return

  const root = document.documentElement
  const previousScrollBehavior = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  try {
    window.scrollBy(0, scrollDelta)
  } finally {
    root.style.scrollBehavior = previousScrollBehavior
  }
}

/**
 * Keep the reader on the same Notion block when responsive reflow changes
 * the height of all content above the viewport.
 */
export default function usePreserveReadingPositionOnResize(resetKey) {
  const anchorRef = useRef(null)

  useEffect(() => {
    let resizeTimer = null
    let refreshFrame = null
    let resizePending = false
    let viewportWidth = getViewportWidth()

    const refreshAnchor = () => {
      refreshFrame = null
      if (resizePending) return
      anchorRef.current = findReadingAnchor()
    }

    const scheduleAnchorRefresh = () => {
      if (resizePending || refreshFrame !== null) return
      refreshFrame = window.requestAnimationFrame(refreshAnchor)
    }

    const finishResize = () => {
      resizeTimer = null
      restoreAnchorPosition(anchorRef.current)
      resizePending = false
      scheduleAnchorRefresh()
    }

    const handleResize = () => {
      const nextWidth = getViewportWidth()
      if (nextWidth === viewportWidth) return

      viewportWidth = nextWidth
      if (!anchorRef.current) {
        refreshAnchor()
        return
      }

      resizePending = true
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(finishResize, RESIZE_SETTLE_DELAY)
    }

    const cancelPendingRestore = () => {
      if (!resizePending) return
      window.clearTimeout(resizeTimer)
      resizeTimer = null
      resizePending = false
      scheduleAnchorRefresh()
    }

    refreshAnchor()
    scheduleAnchorRefresh()
    window.addEventListener('scroll', scheduleAnchorRefresh, { passive: true })
    window.addEventListener('resize', handleResize)
    window.addEventListener('wheel', cancelPendingRestore, { passive: true })
    window.addEventListener('touchstart', cancelPendingRestore, {
      passive: true
    })
    window.addEventListener('keydown', cancelPendingRestore)

    return () => {
      window.clearTimeout(resizeTimer)
      if (
        refreshFrame !== null &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(refreshFrame)
      }
      window.removeEventListener('scroll', scheduleAnchorRefresh)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('wheel', cancelPendingRestore)
      window.removeEventListener('touchstart', cancelPendingRestore)
      window.removeEventListener('keydown', cancelPendingRestore)
    }
  }, [resetKey])
}
