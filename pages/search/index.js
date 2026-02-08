import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { fetchNotionPageBlocks as getPage } from '@/lib/db/notion/getPostBlocks'
import { DynamicLayout } from '@/themes/theme'
import { useRouter } from 'next/router'
import { overwriteAlgoliaSearch } from '@/lib/plugins/algolia'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import { idToUuid } from 'notion-utils'
import { useMemo } from 'react'

/**
 * 搜索路由
 * 支持搜索标题、摘要、标签、分类以及文章内容
 * @param {*} props
 * @returns
 */
const Search = props => {
  const { posts } = props

  const router = useRouter()
  const keyword = router?.query?.s

  // 使用 useMemo 优化过滤性能，避免每次渲染都重新计算
  const filteredPosts = useMemo(() => {
    if (!keyword) return []

    const searchKeyword = keyword.toLowerCase()
    return posts.filter(post => {
      const tagContent = Array.isArray(post?.tags) ? post?.tags.join(' ') : (post?.tags || '')
      const categoryContent = Array.isArray(post.category) ? post.category.join(' ') : (post.category || '')
      // 搜索标题、摘要、标签、分类
      const metaContent = (post.title || '') + (post.summary || '') + tagContent + categoryContent
      // 搜索文章内容（如果有的话）
      const bodyContent = String(post.content || '')
      const searchContent = metaContent + ' ' + bodyContent
      return searchContent.toLowerCase().includes(searchKeyword)
    }).map(post => {
      const newPost = { ...post, results: [] }
      const bodyContent = String(post.content || '')
      const _searchKeyword = searchKeyword.toLowerCase()
      let index = bodyContent.toLowerCase().indexOf(_searchKeyword)
      let count = 0
      const MAX_RESULT = 3
      while (index > -1 && count < MAX_RESULT) {
        const start = Math.max(0, index - 50)
        const end = Math.min(bodyContent.length, index + 150)
        newPost.results.push(bodyContent.slice(start, end))
        index = bodyContent.toLowerCase().indexOf(_searchKeyword, index + _searchKeyword.length)
        count++
      }
      return newPost
    })
  }, [keyword, posts])

  const newProps = { ...props, posts: filteredPosts }

  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutSearch' {...newProps} />
}

/**
 * 浏览器前端搜索
 * 优化：保留更多字段用于内容搜索
 */
export async function getStaticProps({ locale }) {
  const props = await fetchGlobalAllData({
    from: 'search-props',
    locale
  })
  const { allPages } = props

  const publishedPosts = allPages?.filter(
    page => (page.type === 'Post' || page.type === 'Page') && page.status === 'Published'
  ) || []

  // 并发控制函数
  const pMap = async (array, mapper, concurrency = 5) => {
    const results = new Array(array.length)
    const iterator = array.entries()

    const worker = async () => {
      for (const [i, item] of iterator) {
        try {
          results[i] = await mapper(item, i)
        } catch (e) {
          console.error('Task failed', e)
          results[i] = item // Fallback
        }
      }
    }

    const workers = Array(concurrency).fill(null).map(worker)
    await Promise.all(workers)
    return results
  }

  // 优化：使用并发控制获取全文内容，减少构建资源占用
  let validPosts = await pMap(publishedPosts, async post => {
    // 再次过滤：确保有 id 和 slug
    if (!post.id || !post.slug) {
        return null
    }
    const newPost = { ...post }
    newPost.summary = newPost.summary || null
    newPost.password = newPost.password || null
    newPost.tags = newPost.tags || null
    newPost.category = newPost.category || null
    newPost.pageCover = newPost.pageCover || null
    newPost.pageCoverThumbnail = newPost.pageCoverThumbnail || null
    newPost.ext = newPost.ext || {}

    // 尝试获取全文内容
    if (!newPost.content && !newPost.blockMap?.rawText) {
      try {
        const blockMap = await getPage(post.id, 'search-index')
        // 提取blockMap中的content字段(BlockID列表)到post中，以便getPageContentText遍历
        const pId = idToUuid(post.id)
        let contentIds = []
        if (blockMap?.block?.[pId]?.value?.content) {
          contentIds = blockMap.block[pId].value.content
        } else if (blockMap?.block) {
          // 兼容id不一致的情况
          const blockId = Object.keys(blockMap.block).find(id => blockMap.block[id].value.type === 'page')
          if (blockId) {
            contentIds = blockMap.block[blockId].value.content
          }
        }
        newPost.content = contentIds
        newPost.content = getPageContentText(newPost, blockMap)
        if (!newPost.content) {
          console.warn('Search index: content is empty for', post.id)
        }
      } catch (e) {
        console.error('Search index fetch failed for', post.id, e)
      }
    } else {
      newPost.content = newPost.content || newPost.blockMap?.rawText || null
    }

    // 清理 blockMap 以减小 JSON 大小
    if (newPost.blockMap) {
      delete newPost.blockMap
    }

    return newPost
  }, 3) // 并发数限制为 3，降低 Vercel 资源压力

  // 过滤掉处理过程中返回 null 的无效文章
  props.posts = validPosts.filter(p => p !== null).map(p => {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      tags: p.tags,
      category: p.category,
      type: p.type,
      status: p.status,
      publishDate: p.publishDate,
      lastEditedDate: p.lastEditedDate,
      pageCover: p.pageCover,
      pageCoverThumbnail: p.pageCoverThumbnail,
      content: p.content,
      ext: p.ext
    }
  })

  // 上传数据到 Algolia
  if (siteConfig('ALGOLIA_APP_ID') && process.env.npm_lifecycle_event === 'build') {
      await overwriteAlgoliaSearch(props.posts)
  }

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

export default Search
