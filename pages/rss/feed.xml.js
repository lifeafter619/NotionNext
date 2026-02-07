import BLOG from '@/blog.config'
import NotionPage from '@/components/NotionPage'
import { getPostBlocks } from '@/lib/db/getSiteData'
import { getGlobalData } from '@/lib/db/getSiteData'
import { Feed } from 'feed'
import ReactDOMServer from 'react-dom/server'
import { decryptEmail } from '@/lib/plugins/mailEncrypt'

/**
 * 生成RSS内容
 */
const createFeedContent = async post => {
  // 加密的文章内容只返回摘要
  if (post.password && post.password !== '') {
    return post.summary
  }
  const blockMap = await getPostBlocks(post.id, 'rss-content')
  if (blockMap) {
    post.blockMap = blockMap
    const content = ReactDOMServer.renderToString(<NotionPage post={post} />)
    const regexExp =
      /<div class="notion-collection-row"><div class="notion-collection-row-body"><div class="notion-collection-row-property"><div class="notion-collection-column-title"><svg.*?class="notion-collection-column-title-icon">.*?<\/svg><div class="notion-collection-column-title-body">.*?<\/div><\/div><div class="notion-collection-row-value">.*?<\/div><\/div><\/div><\/div>/g
    return content.replace(regexExp, '')
  }
}

export async function getServerSideProps({ res, locale }) {
  const from = 'rss'
  const props = await getGlobalData({ from, locale })
  const { NOTION_CONFIG, siteInfo, latestPosts } = props
  const TITLE = siteInfo?.title
  const DESCRIPTION = siteInfo?.description
  const LINK = siteInfo?.link
  const AUTHOR = NOTION_CONFIG?.AUTHOR || BLOG.AUTHOR
  const LANG = NOTION_CONFIG?.LANG || BLOG.LANG
  const SUB_PATH = NOTION_CONFIG?.SUB_PATH || BLOG.SUB_PATH
  const CONTACT_EMAIL = decryptEmail(
    NOTION_CONFIG?.CONTACT_EMAIL || BLOG.CONTACT_EMAIL
  )

  const year = new Date().getFullYear()
  const feed = new Feed({
    title: TITLE,
    description: DESCRIPTION,
    link: `${LINK}/${SUB_PATH}`,
    language: LANG,
    favicon: `${LINK}/favicon.png`,
    copyright: `All rights reserved ${year}, ${AUTHOR}`,
    author: {
      name: AUTHOR,
      email: CONTACT_EMAIL,
      link: LINK
    }
  })

  if (latestPosts) {
    for (const post of latestPosts) {
      feed.addItem({
        title: post.title,
        link: `${LINK}/${post.slug}`,
        description: post.summary,
        content: await createFeedContent(post),
        date: new Date(post?.publishDay)
      })
    }
  }

  res.setHeader('Content-Type', 'text/xml')
  // Cache for 1 hour
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=59')
  res.write(feed.rss2())
  res.end()

  return {
    props: {},
  }
}

const FeedXml = () => null
export default FeedXml
