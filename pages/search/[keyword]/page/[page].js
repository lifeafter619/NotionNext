import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { cleanPostListForClient } from '@/lib/utils/clientPost'
import { DynamicLayout } from '@/themes/theme'
import { filterByMemCache } from '..'
import {
  getPaginationSlice,
  parsePositivePageNumber
} from '@/lib/utils/pagination'
import { isExport } from '@/lib/utils/buildMode'

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
  const pageNumber = parsePositivePageNumber(page)
  if (!pageNumber || pageNumber < 2) return { notFound: true }

  const props = await fetchGlobalAllData({
    from: 'search-props',
    pageType: ['Post'],
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
  props.posts = cleanPostListForClient(props.posts, {
    keepContent: true,
    keepResults: true
  })
  props.keyword = keyword
  props.page = pageNumber
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
    paths: [],
    fallback: isExport() ? false : 'blocking'
  }
}

export default Index
