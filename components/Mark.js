import { loadExternalResource } from '@/lib/utils'

let markJsLoadPromise = null
const MARK_JS_LOAD_TIMEOUT = 3000

function escapeSearchKeyword(search) {
  return String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rejectAfterTimeout(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('mark.js load timeout')), ms)
  })
}

function runOnIdle() {
  return new Promise(resolve => {
    const done = () => resolve()

    if (
      typeof window === 'undefined' ||
      typeof window.requestIdleCallback !== 'function'
    ) {
      setTimeout(done, 0)
      return
    }

    window.requestIdleCallback(done, { timeout: 800 })
  })
}

function ensureMarkScript() {
  if (!markJsLoadPromise) {
    markJsLoadPromise = loadExternalResource(
      'https://cdnjs.cloudflare.com/ajax/libs/mark.js/8.11.1/mark.min.js',
      'js'
    ).catch(error => {
      markJsLoadPromise = null
      throw error
    })
  }
  return markJsLoadPromise
}

function shouldSkipTextNode(node) {
  const parent = node.parentElement
  if (!parent) return true
  if (parent.closest('.search-highlight')) return true

  const ignoredTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'])
  return ignoredTags.has(parent.tagName)
}

function markTextNode(node, regex, target) {
  if (shouldSkipTextNode(node)) return 0

  const text = node.nodeValue || ''
  regex.lastIndex = 0

  let match
  let lastIndex = 0
  let count = 0
  const fragment = document.createDocumentFragment()

  while ((match = regex.exec(text))) {
    const matchText = match[0]
    if (!matchText) break

    if (match.index > lastIndex) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, match.index))
      )
    }

    const element = document.createElement(target.element || 'span')
    element.className = target.className || ''
    element.textContent = matchText
    fragment.appendChild(element)

    count += 1
    lastIndex = match.index + matchText.length
  }

  if (count < 1) return 0

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
  }

  node.parentNode.replaceChild(fragment, node)
  return count
}

function markContainerFallback(container, regex, target) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const textNodes = []

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode)
  }

  return textNodes.reduce(
    (count, node) => count + markTextNode(node, regex, target),
    0
  )
}

/**
 * Highlights search keywords in DOM safely without blocking main-thread work.
 */
export default async function replaceSearchResult({ doms, search, target }) {
  if (!doms || !search || !target || typeof window === 'undefined') {
    return
  }

  const keyword = String(search).trim()
  if (!keyword) {
    return
  }

  try {
    await runOnIdle()

    let Mark = window.Mark
    if (!Mark) {
      try {
        await Promise.race([
          ensureMarkScript(),
          rejectAfterTimeout(MARK_JS_LOAD_TIMEOUT)
        ])
        Mark = window.Mark
      } catch (error) {
        console.warn('Search highlight falling back to native marker:', error)
      }
    }

    const regex = new RegExp(escapeSearchKeyword(keyword), 'gim')

    const markContainer = container => {
      if (!Mark) {
        return Promise.resolve(markContainerFallback(container, regex, target))
      }

      return new Promise(resolve => {
        const originalDone = target.done

        const options = {
          ...target,
          done: totalMatches => {
            originalDone?.(totalMatches)
            resolve(totalMatches)
          }
        }

        const instance = new Mark(container)
        instance.markRegExp(regex, options)
      })
    }

    if (doms instanceof HTMLCollection) {
      return await Promise.all(Array.from(doms).map(markContainer))
    } else {
      return await markContainer(doms)
    }
  } catch (error) {
    console.error('Search highlight failed:', error)
  }
}
