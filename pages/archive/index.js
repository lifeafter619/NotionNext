import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { isBrowser } from '@/lib/utils'
import { formatDateFmt } from '@/lib/utils/formatDate'
import { DynamicLayout } from '@/themes/theme'
import { useEffect } from 'react'

/**
 * 归档首页
 * @param {*} props
 * @returns
 */
const ArchiveIndex = props => {
  useEffect(() => {
    if (isBrowser) {
      const anchor = window.location.hash
      if (anchor) {
        setTimeout(() => {
          const anchorElement = document.getElementById(anchor.substring(1))
          if (anchorElement) {
            anchorElement.scrollIntoView({ block: 'start', behavior: 'smooth' })
          }
        }, 300)
      }
    }
  }, [])

  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutArchive' {...props} />
}

export async function getStaticProps({ locale }) {
  const props = await fetchGlobalAllData({ from: 'archive-index', locale })

  // 过滤并清理数据，保留所有字段但修复 undefined 值以避免序列化错误
  const posts = props.allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  ).map(post => {
    const newPost = { ...post }
    // 修复可能为 undefined 的字段
    newPost.summary = newPost.summary || null
    newPost.password = newPost.password || null
    newPost.tags = newPost.tags || null
    newPost.category = newPost.category || null
    newPost.pageCover = newPost.pageCover || null
    newPost.pageCoverThumbnail = newPost.pageCoverThumbnail || null
    newPost.ext = newPost.ext || {}
    return newPost
  })

  delete props.allPages

  const postsSortByDate = [...posts]

  postsSortByDate.sort((a, b) => {
    return b?.publishDate - a?.publishDate
  })

  const archivePosts = {}

  postsSortByDate.forEach(post => {
    const date = formatDateFmt(post.publishDate, 'yyyy-MM')
    if (archivePosts[date]) {
      archivePosts[date].push(post)
    } else {
      archivePosts[date] = [post]
    }
  })

  props.archivePosts = archivePosts
  props.posts = posts

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

export default ArchiveIndex
