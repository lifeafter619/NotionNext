import { useEffect, useMemo, useState } from 'react'
import { uuidToId } from 'notion-utils'

function getHeadingIndentLevel(node) {
  const tagMatch = node.tagName?.match(/^H([1-6])$/)
  if (tagMatch) {
    return Math.max(Number(tagMatch[1]) - 1, 0)
  }

  const className = typeof node.className === 'string' ? node.className : ''
  const classMatch = className.match(/notion-h([1-6])/)
  if (classMatch) {
    return Math.max(Number(classMatch[1]) - 1, 0)
  }

  return 0
}

function buildTocFromArticleHeadings() {
  if (typeof document === 'undefined') return []

  const article = document.getElementById('notion-article')
  if (!article) return []

  const headings = Array.from(
    article.querySelectorAll('.notion-h, h1, h2, h3, h4, h5, h6')
  )
  const seen = new Set()

  return headings
    .map((node, index) => {
      const text = node.textContent?.trim()
      if (!text) return null

      const sourceId =
        node.getAttribute('data-id') || node.id || `article-heading-${index}`
      let id = uuidToId(sourceId)

      if (seen.has(id)) {
        id = `${id}-${index}`
      }
      seen.add(id)

      if (!node.id) {
        node.id = id
      }
      if (node.getAttribute('data-id') !== id) {
        node.setAttribute('data-id', id)
      }

      return {
        id,
        text,
        indentLevel: getHeadingIndentLevel(node)
      }
    })
    .filter(Boolean)
}

export function useArticleToc(postToc, enabled = true) {
  const serverToc = useMemo(
    () => (Array.isArray(postToc) ? postToc.filter(Boolean) : []),
    [postToc]
  )
  const [clientToc, setClientToc] = useState([])

  useEffect(() => {
    if (!enabled || serverToc.length > 0) {
      setClientToc([])
      return
    }

    let cancelled = false
    let observer = null
    let retryTimer = null
    let syncTimer = null

    const syncToc = () => {
      if (!cancelled) {
        setClientToc(buildTocFromArticleHeadings())
      }
    }

    const scheduleSyncToc = () => {
      if (cancelled || syncTimer) return

      syncTimer = setTimeout(() => {
        syncTimer = null
        syncToc()
      }, 100)
    }

    const observeArticle = () => {
      if (cancelled) return

      syncToc()

      const article = document.getElementById('notion-article')
      if (!article) {
        retryTimer = setTimeout(observeArticle, 500)
        return
      }

      if (typeof MutationObserver !== 'function') return

      observer = new MutationObserver(scheduleSyncToc)
      observer.observe(article, {
        childList: true,
        subtree: true
      })
    }

    observeArticle()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      clearTimeout(syncTimer)
      observer?.disconnect()
    }
  }, [enabled, serverToc.length])

  return serverToc.length > 0 ? serverToc : clientToc
}
