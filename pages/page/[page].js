import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, getPostBlocks } from '@/lib/db/SiteDataApi'
import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'
import { cleanPostListForClient } from '@/lib/utils/clientPost'
import { DynamicLayout } from '@/themes/theme'
import {
  getPaginationSlice,
  normalizePageSize,
  parsePositivePageNumber
} from '@/lib/utils/pagination'
import { isExport } from '@/lib/utils/buildMode'

/**
 * 文章列表分页
 * @param {*} props
 * @returns
 */
const Page = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutPostList' {...props} />
}

export async function getStaticPaths({ locale }) {
  const from = 'page-paths'
  const { postCount, NOTION_CONFIG } = await fetchGlobalAllData({
    from,
    locale
  })
  const totalPages = Math.ceil(
    postCount /
      normalizePageSize(siteConfig('POSTS_PER_PAGE', 12, NOTION_CONFIG))
  )
  return {
    // remove first page, we 're not gonna handle that.
    paths: Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => ({
      params: { page: '' + (i + 2) }
    })),
    fallback: isExport() ? false : 'blocking'
  }
}

export async function getStaticProps({ params: { page }, locale }) {
  const pageNumber = parsePositivePageNumber(page)
  if (!pageNumber || pageNumber < 2) return { notFound: true }

  const from = `page-${page}`
  const props = await fetchGlobalAllData({ from, locale })
  const { allPages } = props
  const POST_PREVIEW_LINES = siteConfig(
    'POST_PREVIEW_LINES',
    12,
    props?.NOTION_CONFIG
  )

  const allPosts = (allPages || []).filter(
    page => page?.type === 'Post' && page.status === 'Published'
  )
  const POSTS_PER_PAGE = siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)
  const pagination = getPaginationSlice({
    page: pageNumber,
    totalItems: allPosts.length,
    pageSize: POSTS_PER_PAGE,
    minimumPage: 2
  })
  if (!pagination.isValid) {
    return {
      notFound: true,
      revalidate: isExport() ? undefined : 60
    }
  }
  // 处理分页
  props.posts = allPosts.slice(pagination.start, pagination.end)
  props.page = pageNumber

  // 处理预览
  if (siteConfig('POST_LIST_PREVIEW', false, props?.NOTION_CONFIG)) {
    for (const i in props.posts) {
      const post = props.posts[i]
      if (post.password && post.password !== '') {
        continue
      }
      const rawBlockMap = await getPostBlocks(
        post.id,
        'slug',
        POST_PREVIEW_LINES
      )
      post.blockMap = adapterNotionBlockMap(rawBlockMap)
      if (post.blockMap?.block) {
        post.blockMap.block = formatNotionBlock(post.blockMap.block)
      }
    }
  }

  props.posts = cleanPostListForClient(props.posts, {
    keepBlockMap: siteConfig('POST_LIST_PREVIEW', false, props?.NOTION_CONFIG)
  })
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

export default Page
