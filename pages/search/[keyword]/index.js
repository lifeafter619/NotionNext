import BLOG from '@/blog.config'
import { getDataFromCache } from '@/lib/cache/cache_manager'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import { fetchNotionPageBlocks as getPage } from '@/lib/db/notion/getPostBlocks'
import { idToUuid } from 'notion-utils'

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
    page => (page.type === 'Post' || page.type === 'Page') && page.status === 'Published'
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
  props.keyword = keyword
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
    paths: [{ params: { keyword: 'NotionNext' } }],
    fallback: true
  }
}

/**
 * 在内存缓存中进行全文索引
 * @param {*} allPosts
 * @param keyword 关键词
 * @returns
 */
async function filterByMemCache(allPosts, keyword) {
  const filterPosts = []
  if (keyword) {
    keyword = keyword.trim().toLowerCase()
  }
  for (const post of allPosts) {
    const cacheKey = 'page_block_' + post.id
    let page = await getDataFromCache(cacheKey, true)
    if (!page) {
      page = await getPage(post.id, 'search-index')
    }
    const tagContent =
      post?.tags && Array.isArray(post?.tags) ? post?.tags.join(' ') : ''
    const categoryContent =
      post.category && Array.isArray(post.category)
        ? post.category.join(' ')
        : ''
    const articleInfo = post.title + post.summary + tagContent + categoryContent
    let hit = articleInfo.toLowerCase().indexOf(keyword) > -1
    const pId = idToUuid(post.id)
    if (page?.block?.[pId]?.value?.content) {
      post.content = page.block[pId].value.content
    } else if (page?.block) {
      // 兼容id不一致的情况
      const blockId = Object.keys(page.block).find(id => page.block[id].value.type === 'page')
      if (blockId) {
        post.content = page.block[blockId].value.content
      }
    }
    const contentText = getPageContentText(post, page)
    post.content = contentText
    post.results = []
    let index = contentText.toLowerCase().indexOf(keyword)
    let count = 0
    const MAX_RESULT = 3
    while (index > -1 && count < MAX_RESULT) {
      hit = true
      // 截取搜索结果摘要
      const start = Math.max(0, index - 50)
      const end = Math.min(contentText.length, index + 150)
      post.results.push(contentText.slice(start, end))
      index = contentText.toLowerCase().indexOf(keyword, index + keyword.length)
      count++
    }

    if (hit) {
      filterPosts.push(post)
    }
  }
  return filterPosts
}

export default Index
