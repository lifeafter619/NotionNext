const { loadExternalResource } = require('../utils')

const WOW_CSS_URL = '/css/wow/animate.css'
const WOW_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/wow/1.1.2/wow.min.js'

let wowLoadPromise = null

/**
 * WOWjs动画，结合animate.css使用很方便
 * 是data-aos的平替 aos ≈ wowjs + animate
 */
export const loadWowJS = async () => {
  if (shouldSkipWow()) {
    return null
  }

  await waitForIdle()

  if (shouldSkipWow() || !hasWowElements()) {
    return null
  }

  if (!wowLoadPromise) {
    wowLoadPromise = loadWowAssets().catch(error => {
      wowLoadPromise = null
      throw error
    })
  }

  return wowLoadPromise
}

async function loadWowAssets() {
  await loadExternalResource(WOW_CSS_URL, 'css')
  await loadExternalResource(WOW_JS_URL, 'js')

  const WOW = window.WOW
  if (WOW && !shouldSkipWow()) {
    new WOW().init()
  }
}

function shouldSkipWow() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return true
  }

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return isMobile || prefersReducedMotion
}

function hasWowElements() {
  if (typeof document === 'undefined') return false
  return Boolean(document.querySelector('.wow,[data-wow-delay]'))
}

function waitForIdle() {
  if (typeof window === 'undefined') return Promise.resolve()

  return new Promise(resolve => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(resolve, { timeout: 1200 })
      return
    }

    window.setTimeout(resolve, 0)
  })
}
