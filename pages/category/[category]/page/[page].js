import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { cleanPostListForClient } from '@/lib/utils/clientPost'
import { DynamicLayout } from '@/themes/theme'
import {
  getPaginationSlice,
  normalizePageSize,
  parsePositivePageNumber
} from '@/lib/utils/pagination'
import { isExport } from '@/lib/utils/buildMode'

/**
 * 分类页
 * @param {*} props
 * @returns
 */

export default function Category(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutPostList' {...props} />
}

export async function getStaticProps({ params: { category, page }, locale }) {
  const pageNumber = parsePositivePageNumber(page)
  if (!pageNumber || pageNumber < 2) return { notFound: true }

  const from = 'category-page-props'
  let props = await fetchGlobalAllData({ from, locale })

  // 过滤状态类型；Notion 拉取异常时 allPages 可能缺失，兜底为空列表避免构建崩溃
  props.posts = (props.allPages || [])
    .filter(page => page?.type === 'Post' && page.status === 'Published')
    .filter(post => post?.category === category)
  // 处理文章页数
  props.postCount = props.posts.length
  const POSTS_PER_PAGE = siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)
  const pagination = getPaginationSlice({
    page: pageNumber,
    totalItems: props.postCount,
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
  props.posts = props.posts.slice(pagination.start, pagination.end)
  props.posts = cleanPostListForClient(props.posts)

  delete props.allPages
  props.page = pageNumber

  props = { ...props, category, page: pageNumber }

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

export async function getStaticPaths() {
  const from = 'category-paths'
  const { categoryOptions, allPages, NOTION_CONFIG } = await fetchGlobalAllData(
    {
      from
    }
  )
  const paths = []
  // 与 index.js 的守卫保持一致：categoryOptions 可能是非数组（旧缓存/异常数据）
  const categories = Array.isArray(categoryOptions)
    ? categoryOptions.filter(
        category =>
          typeof category?.name === 'string' && category.name.length > 0
      )
    : []

  categories.forEach(category => {
    // 过滤状态类型
    const categoryPosts = (allPages || [])
      .filter(page => page?.type === 'Post' && page.status === 'Published')
      .filter(post => post?.category === category.name)
    // 处理文章页数
    const postCount = categoryPosts.length
    const totalPages = Math.ceil(
      postCount /
        normalizePageSize(siteConfig('POSTS_PER_PAGE', 12, NOTION_CONFIG))
    )
    if (totalPages > 1) {
      for (let i = 2; i <= totalPages; i++) {
        paths.push({ params: { category: category.name, page: '' + i } })
      }
    }
  })

  return {
    paths,
    fallback: isExport() ? false : 'blocking'
  }
}
