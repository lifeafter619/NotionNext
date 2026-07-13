import BLOG from '@/blog.config'
import { getDataFromCache } from '@/lib/cache/cache_manager'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import {
  fetchNotionPageBlocks as getPage,
  getPageBlockCacheKey
} from '@/lib/db/notion/getPostBlocks'
import { cleanPostListForClient } from '@/lib/utils/clientPost'
import { isExport } from '@/lib/utils/buildMode'
import { idToUuid } from 'notion-utils'

const SEARCH_CONCURRENCY = 4
const MAX_SEARCH_SNIPPETS = 3

const Index = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutSearch' {...props} />
}

/**
 * 服务端搜索
 * @param {*} param0
 * @returns
 */
export async function getStaticProps({ params: { keyword }, locale }) {
  const props = await fetchGlobalAllData({
    from: 'search-props',
    locale
  })
  const { allPages } = props
  const allPosts = allPages?.filter(
    page =>
      (page?.type === 'Post' || page?.type === 'Page') &&
      page.status === 'Published'
  )
  props.posts = await filterByMemCache(allPosts, keyword)
  props.postCount = props.posts.length
  const POST_LIST_STYLE = siteConfig(
    'POST_LIST_STYLE',
    'Page',
    props?.NOTION_CONFIG
  )
  const POSTS_PER_PAGE = siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)

  // 处理分页
  if (POST_LIST_STYLE === 'scroll') {
    // 滚动列表默认给前端返回所有数据
  } else if (POST_LIST_STYLE) {
    props.posts = props.posts?.slice(0, POSTS_PER_PAGE)
  }
  props.posts = cleanPostListForClient(props.posts, {
    keepContent: true,
    keepResults: true
  })
  props.keyword = keyword
  delete props.allPages
  return {
    props,
    revalidate: isExport()
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export function getStaticPaths() {
  return {
    paths: [{ params: { keyword: 'NotionNext' } }],
    fallback: isExport() ? false : 'blocking'
  }
}

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
 * 在内存缓存中进行全文索引
 * @param {*} allPosts
 * @param keyword 关键词
 * @returns
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
        // 兼容id不一致的情况
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

export default Index
