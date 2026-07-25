import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { extractLangId, extractLangPrefix } from '@/lib/utils/pageId'
import { Feed } from 'feed'
import { buildRssPostLink, getPublicRssPosts } from './rssApi'

function getRssPageId(locale = BLOG.LANG) {
  const pageIds = String(BLOG.NOTION_PAGE_ID || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  if (pageIds.length === 0) return ''

  const normalizedLocale = String(locale || '').toLowerCase()
  const language = normalizedLocale.split('-')[0]
  const localized = pageIds.find(item => {
    const prefix = extractLangPrefix(item).toLowerCase()
    return prefix && (prefix === normalizedLocale || prefix === language)
  })
  const fallback = pageIds.find(item => !extractLangPrefix(item)) || pageIds[0]
  return extractLangId(localized || fallback)
}

/**
 * Generate the lightweight runtime feeds used by both /api/rss and
 * /rss/feed.xml. Full article rendering remains a build-time concern.
 */
export async function generateRssContent({ locale = BLOG.LANG } = {}) {
  const pageId = getRssPageId(locale)
  if (!pageId) return null

  const props = await fetchGlobalAllData({
    from: 'rss-api',
    pageId,
    locale
  })
  if (!props?.allPages) return null

  const { siteInfo, allPages, NOTION_CONFIG } = props
  const latestPosts = getPublicRssPosts(allPages)
  if (latestPosts.length === 0) return null

  const title = siteInfo?.title || BLOG.AUTHOR
  const description = siteInfo?.description || BLOG.BIO
  const link = String(
    BLOG.LINK || NOTION_CONFIG?.LINK || siteInfo?.link || ''
  ).replace(/\/+$/, '')
  if (!link) return null

  const author = NOTION_CONFIG?.AUTHOR || BLOG.AUTHOR
  const language = NOTION_CONFIG?.LANG || locale || BLOG.LANG
  const year = new Date().getFullYear()
  const feed = new Feed({
    id: link,
    title,
    description,
    link,
    language,
    favicon: `${link}/favicon.png`,
    copyright: `All rights reserved ${year}, ${author}`,
    feedLinks: {
      rss2: `${link}/rss/feed.xml`,
      atom: `${link}/rss/atom.xml`,
      json: `${link}/rss/feed.json`
    },
    author: {
      name: author,
      link
    }
  })

  for (const post of latestPosts) {
    const postDate = new Date(
      post?.publishDate ?? post?.publishDay ?? Date.now()
    )
    feed.addItem({
      title: post.title,
      link: buildRssPostLink(link, post.slug),
      description: post.summary || '',
      date: Number.isNaN(postDate.getTime()) ? new Date() : postDate
    })
  }

  return {
    xml: feed.rss2(),
    atomXml: feed.atom1(),
    json: feed.json1()
  }
}
