import { getPublicPostBlockMap } from '@/lib/utils/publicPost'
import BLOG from '@/blog.config'
import NotionPage from '@/components/NotionPage'
import { siteConfig } from '@/lib/config'
import { getPostBlocks } from '@/lib/db/SiteDataApi'
import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import { ImageViewerProvider } from '@/lib/ImageViewerContext'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'
import { normalizeSiteUrl } from '@/lib/sitemap-utils'
import { Feed } from 'feed'
import fs from 'fs'
import ReactDOMServer from 'react-dom/server'
import { decryptEmail } from '@/lib/plugins/mailEncrypt'

export function shouldGenerateRssForLocale({
  locale,
  defaultLocale = BLOG.LANG
} = {}) {
  return !locale || locale === defaultLocale
}

/**
 * 生成RSS内容
 * @param {*} post
 * @returns
 */
const createFeedContent = async (post, rssFullContent = true, allPages) => {
  // 关闭RSS全文或文章已加密时，只返回摘要
  if (!rssFullContent || (post.password && post.password !== '')) {
    return post.summary
  }
  const blockMap = await getPostBlocks(post.id, 'rss-content')
  if (blockMap) {
    const renderPost = { ...post, blockMap }
    // Notion修改了数据格式再次做统一兼容；加密/受保护内容不得进入 RSS
    renderPost.blockMap = getPublicPostBlockMap(
      renderPost,
      adapterNotionBlockMap(renderPost.blockMap),
      allPages
    )
    // 格式化内容，部分的样式字段格式在此处理
    if (renderPost.blockMap?.block) {
      renderPost.blockMap.block = formatNotionBlock(renderPost.blockMap.block)
    }

    const content = ReactDOMServer.renderToString(
      <ImageViewerProvider>
        <NotionPage post={renderPost} />
      </ImageViewerProvider>
    )
    const regexExp =
      /<div class="notion-collection-row"><div class="notion-collection-row-body"><div class="notion-collection-row-property"><div class="notion-collection-column-title"><svg.*?class="notion-collection-column-title-icon">.*?<\/svg><div class="notion-collection-column-title-body">.*?<\/div><\/div><div class="notion-collection-row-value">.*?<\/div><\/div><\/div><\/div>/g
    return content.replace(regexExp, '')
  }
}

/**
 * 生成RSS数据
 * @param {*} props
 */
export function createFeedFileUrl(siteUrl, subPath, file) {
  const base = (normalizeSiteUrl(siteUrl) || '').replace(/\/+$/, '')
  const prefix = String(subPath || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
  return [base, prefix, file].filter(Boolean).join('/')
}

export async function createFeed({
  siteInfo,
  NOTION_CONFIG,
  posts = [],
  allPages,
  subPath,
  renderContent = createFeedContent
} = {}) {
  const TITLE = siteInfo?.title
  const DESCRIPTION = siteInfo?.description
  const LINK = normalizeSiteUrl(siteInfo?.link || BLOG.LINK)
  const AUTHOR = NOTION_CONFIG?.AUTHOR || BLOG.AUTHOR
  const LANG = NOTION_CONFIG?.LANG || BLOG.LANG
  const CONTACT_EMAIL = decryptEmail(
    NOTION_CONFIG?.CONTACT_EMAIL || BLOG.CONTACT_EMAIL
  )
  const RSS_FULL_CONTENT = siteConfig('RSS_FULL_CONTENT', true, NOTION_CONFIG)

  const year = new Date().getFullYear()
  const feed = new Feed({
    id: createFeedFileUrl(LINK, subPath, 'rss/feed.xml'),
    title: TITLE,
    description: DESCRIPTION,
    link: createFeedFileUrl(LINK, subPath, ''),
    language: LANG,
    favicon: `${LINK}/favicon.png`,
    copyright: `All rights reserved ${year}, ${AUTHOR}`,
    author: {
      name: AUTHOR,
      email: CONTACT_EMAIL,
      link: LINK
    }
  })
  for (const post of posts) {
    const slugWithoutLeadingSlash = post?.slug?.startsWith('/')
      ? post.slug.slice(1)
      : post.slug
    const postDate = new Date(post?.publishDate ?? post?.publishDay)
    feed.addItem({
      title: post.title,
      link: `${LINK}/${slugWithoutLeadingSlash}`,
      description: post.summary,
      content: await renderContent(post, RSS_FULL_CONTENT, allPages),
      date: isNaN(postDate.getTime()) ? new Date() : postDate
    })
  }

  return feed
}

export async function generateRss(props) {
  if (isFeedRecentlyUpdated('./public/rss/feed.xml', 10)) return
  const { NOTION_CONFIG, siteInfo, latestPosts } = props
  console.log('[RSS订阅] 生成/rss/feed.xml')
  const feed = await createFeed({
    siteInfo: { ...siteInfo, link: BLOG.LINK || siteInfo?.link },
    NOTION_CONFIG,
    posts: latestPosts,
    allPages: props.allPages,
    subPath: NOTION_CONFIG?.SUB_PATH || BLOG.SUB_PATH
  })

  try {
    fs.mkdirSync('./public/rss', { recursive: true })
    fs.writeFileSync('./public/rss/feed.xml', feed.rss2())
    fs.writeFileSync('./public/rss/atom.xml', feed.atom1())
    fs.writeFileSync('./public/rss/feed.json', feed.json1())
  } catch (error) {
    // 在vercel运行环境是只读的，这里会报错；
    // 但在vercel编译阶段、或VPS等其他平台这行代码会成功执行
    // RSS被高频词访问将大量消耗服务端资源，故作为静态文件
  }
}

/**
 * 检查上次更新，如果60分钟内更新过就不操作。
 * @param {*} filePath
 * @param {*} intervalMinutes
 * @returns
 */
function isFeedRecentlyUpdated(filePath, intervalMinutes = 60) {
  try {
    const stats = fs.statSync(filePath)
    const now = new Date()
    const lastModified = new Date(stats.mtime)
    const timeDifference = (now - lastModified) / (1000 * 60) // 转换为分钟
    return timeDifference < intervalMinutes
  } catch (error) {
    // 如果文件不存在，我们需要创建它
    return false
  }
}
