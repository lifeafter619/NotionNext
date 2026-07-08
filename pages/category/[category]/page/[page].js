import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { cleanPostListForClient } from '@/lib/utils/clientPost'
import { DynamicLayout } from '@/themes/theme'

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
  const from = 'category-page-props'
  let props = await fetchGlobalAllData({ from, locale })

  // 过滤状态类型；Notion 拉取异常时 allPages 可能缺失，兜底为空列表避免构建崩溃
  props.posts = (props.allPages || [])
    .filter(page => page.type === 'Post' && page.status === 'Published')
    .filter(post => post && post.category && post.category.includes(category))
  // 处理文章页数
  props.postCount = props.posts.length
  const POSTS_PER_PAGE = siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)
  // 处理分页
  props.posts = props.posts.slice(
    POSTS_PER_PAGE * (page - 1),
    POSTS_PER_PAGE * page
  )
  props.posts = cleanPostListForClient(props.posts)

  delete props.allPages
  props.page = page

  props = { ...props, category, page }

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

export async function getStaticPaths() {
  const from = 'category-paths'
  const { categoryOptions, allPages, NOTION_CONFIG } = await fetchGlobalAllData(
    {
      from
    }
  )
  const paths = []
  // 与 index.js 的守卫保持一致：categoryOptions 可能是非数组（旧缓存/异常数据）
  const categories = Array.isArray(categoryOptions) ? categoryOptions : []

  categories.forEach(category => {
    // 过滤状态类型
    const categoryPosts = (allPages || [])
      .filter(page => page.type === 'Post' && page.status === 'Published')
      .filter(
        post => post && post.category && post.category.includes(category.name)
      )
    // 处理文章页数
    const postCount = categoryPosts.length
    const totalPages = Math.ceil(
      postCount / siteConfig('POSTS_PER_PAGE', null, NOTION_CONFIG)
    )
    if (totalPages > 1) {
      for (let i = 1; i <= totalPages; i++) {
        paths.push({ params: { category: category.name, page: '' + i } })
      }
    }
  })

  return {
    paths,
    fallback: true
  }
}
