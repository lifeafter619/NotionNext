import { loadExternalResource } from '@/lib/utils'

let markJsLoadPromise = null

function escapeSearchKeyword(search) {
  return String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
    )
  }
  return markJsLoadPromise
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
    await ensureMarkScript()
    await runOnIdle()

    const Mark = window.Mark
    if (!Mark) return

    const regex = new RegExp(escapeSearchKeyword(keyword), 'gim')

    const markContainer = container => {
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
      await Promise.all(Array.from(doms).map(markContainer))
    } else {
      await markContainer(doms)
    }
  } catch (error) {
    console.error('Search highlight failed:', error)
  }
}
