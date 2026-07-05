import { isBrowser } from '@/lib/utils'

const DEFAULT_SCROLL_OPTIONS = {
  block: 'start',
  behavior: 'smooth'
}

export function scrollToNotionHeading(idOrHash, options = {}) {
  if (!isBrowser || !idOrHash) return false

  const id = normalizeHashId(idOrHash)
  const target = findNotionHeadingById(id)
  if (!target) return false

  expandClosedToggleAncestors(target)

  if (options.updateHash) {
    updateHash(id)
  }

  const scrollOptions = {
    ...DEFAULT_SCROLL_OPTIONS,
    ...options
  }
  delete scrollOptions.updateHash

  const scroll = () => {
    target.scrollIntoView(scrollOptions)
  }

  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(scroll)
  } else {
    scroll()
  }

  return true
}

export function bindNotionHashScrollHandler(options = {}) {
  if (!isBrowser) return () => {}

  const handleClick = event => {
    if (shouldIgnoreClick(event)) return

    const anchor = event.target?.closest?.('a[href]')
    const id = getSamePageHashId(anchor)
    if (!id || !findNotionHeadingById(id)) return

    event.preventDefault()
    scrollToNotionHeading(id, {
      ...options,
      updateHash: true
    })
  }

  document.addEventListener('click', handleClick)
  return () => document.removeEventListener('click', handleClick)
}

function findNotionHeadingById(id) {
  const escapedId = escapeCssIdentifier(id)
  const byDataId = document.querySelector(`.notion-h[data-id="${escapedId}"]`)
  if (byDataId) return byDataId

  const byId = document.getElementById(id)
  if (!byId) return null
  if (byId.classList?.contains('notion-h')) return byId

  return byId.closest?.('.notion-h') || null
}

function expandClosedToggleAncestors(target) {
  let node = target

  while (node && node !== document.documentElement) {
    if (
      node.matches?.('details.notion-toggle') &&
      node.open === false
    ) {
      node.open = true
    }

    node = node.parentElement
  }
}

function shouldIgnoreClick(event) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

function getSamePageHashId(anchor) {
  if (!anchor) return null

  const href = anchor.getAttribute('href')
  if (!href || href === '#') return null

  try {
    const url = new URL(href, window.location.href)
    const current = new URL(window.location.href)
    if (
      url.origin !== current.origin ||
      url.pathname !== current.pathname ||
      url.search !== current.search ||
      !url.hash
    ) {
      return null
    }

    return normalizeHashId(url.hash)
  } catch {
    return null
  }
}

function normalizeHashId(idOrHash) {
  const id = String(idOrHash).replace(/^#/, '')

  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

function updateHash(id) {
  try {
    window.history.pushState(null, '', `#${encodeURIComponent(id)}`)
  } catch {
    window.location.hash = id
  }
}

function escapeCssIdentifier(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }

  return String(value).replace(/["\\]/g, '\\$&')
}
