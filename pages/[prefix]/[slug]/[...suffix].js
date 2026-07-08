import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { resolvePostProps } from '@/lib/db/SiteDataApi'
import { getStaticPathsBase } from '@/lib/build/staticPaths'
import { isExport } from '@/lib/utils/buildMode'
import { checkSlugHasMorThanTwoSlash } from '@/lib/utils/post'
import Slug from '..'

const isStaticExport = process.env.EXPORT === 'true'

/**
 * 根据notion的slug访问页面
 * 解析三级以上目录 /article/2023/10/29/test
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

export async function getStaticPaths() {
  return getStaticPathsBase({
    from: 'slug-paths',
    filterFn: row => checkSlugHasMorThanTwoSlash(row),
    mapPageToParams: row => ({
      params: {
        prefix: row.slug.split('/')[0],
        slug: row.slug.split('/')[1],
        suffix: row.slug.split('/').slice(2)
      }
    })
  })
}

/**
 * 抓取页面数据
 * @param {*} param0
 * @returns
 */
export async function getStaticProps({
  params: { prefix, slug, suffix },
  locale
}) {
  const props = await resolvePostProps({
    prefix,
    slug,
    suffix,
    locale
  })

  // 未找到文章时用短 revalidate：Notion 瞬时异常也会走到这里，
  // 若按 NEXT_REVALIDATE_SECOND（默认一天）缓存 404，真实文章会被长时间误判
  return {
    props,
    revalidate: isStaticExport
      ? undefined
      : props.post
        ? siteConfig(
            'NEXT_REVALIDATE_SECOND',
            BLOG.NEXT_REVALIDATE_SECOND,
            props.NOTION_CONFIG
          )
        : 60,
    notFound: !props.post
  }
}

export default PrefixSlug
