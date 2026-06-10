import BLOG from '@/blog.config'
import { getDataFromCache } from '@/lib/cache/cache_manager'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { cleanPostListForClient } from '@/lib/utils/clientPost'
import { DynamicLayout } from '@/themes/theme'
import { getPageBlockCacheKey } from '@/lib/db/notion/getPostBlocks'

const SEARCH_CONCURRENCY = 4

const Index = props => {
  const { keyword } = props
  props = { ...props, currentSearch: keyword }

  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutSearch' {...props} />
}

/**
 * 服务端搜索
 * @param {*} param0
 * @returns
 */
export async function getStaticProps({ params: { keyword, page }, locale }) {
  const props = await fetchGlobalAllData({
    from: 'search-props',
    pageType: ['Post'],
    locale
  })
  const { allPages } = props
  const allPosts = allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )
  props.posts = await filterByMemCache(allPosts, keyword)
  props.postCount = props.posts.length
  const POSTS_PER_PAGE = siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)
  // 处理分页
  props.posts = props.posts.slice(
    POSTS_PER_PAGE * (page - 1),
    POSTS_PER_PAGE * page
  )
  props.posts = cleanPostListForClient(props.posts, {
    keepResults: true
  })
  props.keyword = keyword
  props.page = page
  delete props.allPages
  return {
    props,
    revalidate: process.env.EXPORT
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
    paths: [{ params: { keyword: 'NotionNext', page: '1' } }],
    fallback: true
  }
}

/**
 * 将对象的指定字段拼接到字符串
 * @param sourceTextArray
 * @param targetObj
 * @param key
 * @returns {*}
 */
function appendText(sourceTextArray, targetObj, key) {
  if (!targetObj) {
    return sourceTextArray
  }
  const textArray = targetObj[key]
  const text = textArray ? getTextContent(textArray) : ''
  if (text && text !== 'Untitled') {
    return sourceTextArray.concat(text)
  }
  return sourceTextArray
}

/**
 * 递归获取层层嵌套的数组
 * @param {*} textArray
 * @returns
 */
function getTextContent(textArray) {
  if (typeof textArray === 'object' && isIterable(textArray)) {
    let result = ''
    for (const textObj of textArray) {
      result = result + getTextContent(textObj)
    }
    return result
  } else if (typeof textArray === 'string') {
    return textArray
  }
}

/**
 * 对象是否可以遍历
 * @param {*} obj
 * @returns
 */
const isIterable = obj =>
  obj != null && typeof obj[Symbol.iterator] === 'function'

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

/**
 * 在内存缓存中进行全文索引
 * @param {*} allPosts
 * @param keyword 关键词
 * @returns
 */
async function filterByMemCache(allPosts, keyword) {
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
      return hit ? nextPost : null
    }

    const cacheKey = getPageBlockCacheKey(post.id, post.lastEditedDate)
    const page = await getDataFromCache(cacheKey, true)
    let indexContent = [post.summary]
    if (page && page.block) {
      const contentIds = Object.keys(page.block)
      contentIds.forEach(id => {
        const properties = page?.block[id]?.value?.properties
        indexContent = appendText(indexContent, properties, 'title')
        indexContent = appendText(indexContent, properties, 'caption')
      })
    }
    // console.log('全文搜索缓存', cacheKey, page != null)
    let hitCount = 0
    for (const [index, c] of indexContent.entries()) {
      if (!c) {
        continue
      }
      const lowerContent = c.toLowerCase()
      const hitIndex = lowerContent.indexOf(normalizedKeyword)
      if (hitIndex > -1) {
        hit = true
        hitCount += 1
        nextPost.results.push(c)
      } else if (
        hitCount === 0 ||
        (nextPost.results.length - 1) / hitCount < 3 ||
        index === 0
      ) {
        nextPost.results.push(c)
      }
    }

    return hit ? nextPost : null
  })

  return filterPosts.filter(Boolean)
}

export default Index
