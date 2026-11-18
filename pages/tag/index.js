import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import { useRouter } from 'next/router'

const TAG_PREVIEW_POST_FIELDS = [
  'id',
  'title',
  'href',
  'summary',
  'createdTime',
  'category',
  'pageCoverThumbnail'
]

/**
 * 标签首页
 * @param {*} props
 * @returns
 */
const TagIndex = props => {
  const router = useRouter()
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutTagIndex' {...props} />
}

export async function getStaticProps(req) {
  const { locale } = req

  const from = 'tag-index-props'
  const props = await fetchGlobalAllData({ from, locale })
  props.tagPreviewPostsByTag = getTagPreviewPostsByTag({
    allPages: props.allPages,
    tagOptions: props.tagOptions
  })
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

export default TagIndex

export function getTagPreviewPostsByTag({ allPages, tagOptions }) {
  if (!Array.isArray(allPages) || !Array.isArray(tagOptions)) return {}

  const publishedPosts = allPages.filter(
    page => page?.type === 'Post' && page?.status === 'Published'
  )

  return tagOptions.reduce((previews, tag) => {
    const tagName = tag?.name
    if (!tagName) return previews

    previews[tagName] = publishedPosts
      .filter(post => Array.isArray(post.tags) && post.tags.includes(tagName))
      .slice(0, 8)
      .map(pickTagPreviewPostFields)
    return previews
  }, {})
}

function pickTagPreviewPostFields(post) {
  const picked = {}
  TAG_PREVIEW_POST_FIELDS.forEach(field => {
    if (post[field] !== undefined) {
      picked[field] = post[field]
    }
  })
  return picked
}
