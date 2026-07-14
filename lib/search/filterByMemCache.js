import { getDataFromCache } from '@/lib/cache/cache_manager'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import {
  fetchNotionPageBlocks as getPage,
  getPageBlockCacheKey
} from '@/lib/db/notion/getPostBlocks'
import { idToUuid } from 'notion-utils'

const SEARCH_CONCURRENCY = 4
const MAX_SEARCH_SNIPPETS = 3

async function pMapLimit(array, mapper, concurrency = SEARCH_CONCURRENCY) {
  const list = Array.isArray(array) ? array : []
  const results = new Array(list.length)
  const iterator = list.entries()
  const workerCount = Math.min(concurrency, list.length)

  const workers = Array.from({ length: workerCount }, async () => {
    for (const [index, item] of iterator) {
      results[index] = await mapper(item, index)
    }
  })

  await Promise.all(workers)
  return results
}

function getSearchFieldText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' ')
  return value ? String(value) : ''
}

function getSearchSnippets(text, lowerText, keyword) {
  const results = []
  let index = lowerText.indexOf(keyword)

  while (index > -1 && results.length < MAX_SEARCH_SNIPPETS) {
    const start = Math.max(0, index - 50)
    const end = Math.min(text.length, index + 150)
    results.push(text.slice(start, end))
    index = lowerText.indexOf(keyword, index + keyword.length)
  }

  return results
}

/**
 * 在缓存的页面内容中执行全文搜索。
 * 该模块依赖 ioredis 等服务端模块，只能从服务端数据获取路径加载。
 */
export async function filterByMemCache(allPosts, keyword) {
  const normalizedKeyword = String(keyword || '')
    .trim()
    .toLowerCase()
  if (!normalizedKeyword) return []

  const filterPosts = await pMapLimit(allPosts, async post => {
    const nextPost = { ...post, results: [] }
    const tagContent = getSearchFieldText(post.tags)
    const categoryContent = getSearchFieldText(post.category)
    const articleInfo = [
      post.title,
      post.summary,
      tagContent,
      categoryContent
    ].join(' ')
    let hit = articleInfo.toLowerCase().includes(normalizedKeyword)

    if (post.password) {
      return hit ? { ...nextPost, content: null, blockMap: undefined } : null
    }

    try {
      const cacheKey = getPageBlockCacheKey(post.id, post.lastEditedDate)
      let page = await getDataFromCache(cacheKey, true)
      if (!page) {
        page = await getPage(post.id, 'search-index', {
          cacheVersion: post.lastEditedDate
        })
      }

      const pId = idToUuid(post.id)
      if (page?.block?.[pId]?.value?.content) {
        nextPost.content = page.block[pId].value.content
      } else if (page?.block) {
        const blockId = Object.keys(page.block).find(
          id => page.block[id]?.value?.type === 'page'
        )
        if (blockId) {
          nextPost.content = page.block[blockId].value.content
        }
      }

      const contentText = getPageContentText(nextPost, page) || ''
      const lowerContentText = contentText.toLowerCase()
      nextPost.content = contentText
      nextPost.results = getSearchSnippets(
        contentText,
        lowerContentText,
        normalizedKeyword
      )

      if (nextPost.results.length > 0) {
        hit = true
      }
    } catch (error) {
      nextPost.content = null
      nextPost.results = []
      console.error('Failed to inspect post content during search', {
        postId: post.id,
        message: error instanceof Error ? error.message : String(error)
      })
    }

    return hit ? nextPost : null
  })

  return filterPosts.filter(Boolean)
}
