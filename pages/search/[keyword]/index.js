import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import { cleanPostListForClient } from '@/lib/utils/clientPost'
import { isExport } from '@/lib/utils/buildMode'

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
  const { filterByMemCache } = await import('@/lib/search/filterByMemCache')
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
  props.currentSearch = keyword
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

export default Index
