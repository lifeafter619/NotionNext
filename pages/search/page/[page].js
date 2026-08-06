export { default, getStaticProps } from '..'
import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { siteConfig } from '@/lib/config'
import { isExport } from '@/lib/utils/buildMode'

export async function getStaticPaths({ locales } = {}) {
  const paths = []
  const localeList =
    Array.isArray(locales) && locales.length > 0 ? locales : [undefined]
  for (const locale of localeList) {
    const props = await fetchGlobalAllData({ from: 'search-paths', locale })
    const count = (props.allPages || []).filter(
      page =>
        (page?.type === 'Post' || page?.type === 'Page') &&
        page.status === 'Published'
    ).length
    const pageSize = Number(
      siteConfig('POSTS_PER_PAGE', 12, props.NOTION_CONFIG)
    )
    const totalPages = Math.ceil(count / pageSize)
    for (let page = 2; page <= totalPages; page++) {
      paths.push({
        params: { page: String(page) },
        ...(locale ? { locale } : {})
      })
    }
  }

  return { paths, fallback: isExport() ? false : 'blocking' }
}
