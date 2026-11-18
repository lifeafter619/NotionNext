import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import {
  fetchNotionPageBlocks,
  formatNotionBlock
} from '@/lib/db/notion/getPostBlocks'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'

const MAX_DIRECTORY_POSTS = 100
const MAX_RELEVANT_POSTS = 3
const MAX_POST_TEXT_CHARS = 6000
const MAX_CONTEXT_CHARS = 24000
const DATA_FETCH_FAILURE_TITLE = '无法获取Notion数据，请检查Notion_ID'

const cleanText = value =>
  typeof value === 'string'
    ? value
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : ''

const normalizePath = value => {
  const cleaned = cleanText(value)
  if (!cleaned) return ''
  const raw = cleaned.split(/[?#]/)[0].replace(/\/$/, '') || '/'
  try {
    const decoded = decodeURIComponent(raw).toLowerCase()
    return decoded.replace(/^\/[a-z]{2,3}(?:-[a-z]{2,4})?(?=\/|$)/, '') || '/'
  } catch {
    const normalized = raw.toLowerCase()
    return (
      normalized.replace(/^\/[a-z]{2,3}(?:-[a-z]{2,4})?(?=\/|$)/, '') || '/'
    )
  }
}

const getSearchTerms = question => {
  const chunks = cleanText(question)
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9._+-]*|[\u3400-\u9fff]+/g)
  const terms = new Set()
  for (const chunk of chunks || []) {
    if (chunk.length >= 2) terms.add(chunk)
    if (/^[\u3400-\u9fff]+$/.test(chunk) && chunk.length > 2) {
      for (let i = 0; i < chunk.length - 1; i++) {
        terms.add(chunk.slice(i, i + 2))
      }
    }
  }
  return [...terms]
}

const postPathMatches = (post, currentPath) => {
  const normalizedCurrentPath = normalizePath(currentPath)
  if (!normalizedCurrentPath) return false
  const candidates = [post?.href, post?.slug && `/${post.slug}`]
  return candidates.some(
    candidate =>
      normalizePath(candidate) !== '' &&
      normalizePath(candidate) === normalizedCurrentPath
  )
}

const scorePost = (post, terms) => {
  if (!terms.length) return 0
  const title = cleanText(post?.title).toLowerCase()
  const summary = cleanText(post?.summary).toLowerCase()
  const category = cleanText(post?.category).toLowerCase()
  const tags = Array.isArray(post?.tags)
    ? post.tags.map(cleanText).join(' ').toLowerCase()
    : ''
  const path = `${cleanText(post?.slug)} ${cleanText(post?.href)}`.toLowerCase()

  return terms.reduce(
    (score, term) =>
      score +
      (title.includes(term) ? 8 : 0) +
      (tags.includes(term) ? 5 : 0) +
      (category.includes(term) ? 4 : 0) +
      (path.includes(term) ? 4 : 0) +
      (summary.includes(term) ? 2 : 0),
    0
  )
}

export function selectRelevantArticles(posts, question, currentPath) {
  const normalizedPath = normalizePath(currentPath)
  const terms = getSearchTerms(question)

  return posts
    .map((post, index) => ({
      post,
      index,
      current: postPathMatches(post, normalizedPath),
      score: scorePost(post, terms)
    }))
    .filter(item => item.current || item.score > 0)
    .sort((a, b) =>
      a.current !== b.current
        ? Number(b.current) - Number(a.current)
        : b.score - a.score || a.index - b.index
    )
    .slice(0, MAX_RELEVANT_POSTS)
    .map(item => item.post)
}

const formatMetadata = post => {
  const fields = [
    ['标题', cleanText(post?.title)],
    ['链接', cleanText(post?.href || (post?.slug ? `/${post.slug}` : ''))],
    ['摘要', cleanText(post?.summary)],
    ['分类', cleanText(post?.category)],
    [
      '标签',
      Array.isArray(post?.tags)
        ? post.tags.map(cleanText).filter(Boolean).join(', ')
        : ''
    ]
  ]
  return fields
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')
}

async function getPostText(post) {
  const rawBlockMap = await fetchNotionPageBlocks(post.id, 'ai-chat', {
    cacheVersion: post.lastEditedDate
  })
  const adapted = adapterNotionBlockMap(rawBlockMap)
  if (!adapted?.block) return ''

  const pageBlockMap = {
    ...adapted,
    block: formatNotionBlock(adapted.block)
  }
  Object.keys(pageBlockMap.block || {}).forEach(id => {
    if (pageBlockMap.block[id]?.value?.type === 'image') {
      delete pageBlockMap.block[id]
    }
  })
  const rootPage = Object.values(pageBlockMap.block || {})
    .map(entry => entry?.value || entry)
    .find(block => block?.type === 'page' && Array.isArray(block.content))
  const textPost = {
    ...post,
    content: rootPage?.content || []
  }
  return getPageContentText(textPost, pageBlockMap).slice(
    0,
    MAX_POST_TEXT_CHARS
  )
}

export async function buildSiteChatContext({ question, currentPath }) {
  const data = await fetchGlobalAllData({ from: 'ai-chat' })
  if (
    data?.allPages?.some(page =>
      cleanText(page?.title).startsWith(DATA_FETCH_FAILURE_TITLE)
    )
  ) {
    throw new Error('Site data is unavailable.')
  }
  const posts = (data?.allPages || []).filter(
    post =>
      post?.id &&
      post?.status === 'Published' &&
      ['Post', 'Page'].includes(post?.type) &&
      !post?.password
  )
  const selected = selectRelevantArticles(posts, question, currentPath)
  const selectedWithText = await Promise.all(
    selected.map(async post => {
      try {
        return { post, text: await getPostText(post) }
      } catch (error) {
        console.warn('[AI Chat] Failed to read article text:', post.id, error)
        return { post, text: '' }
      }
    })
  )

  const sections = []
  if (selectedWithText.length) {
    sections.push(
      `相关页面正文:\n${selectedWithText
        .map(({ post, text }, index) => {
          const body = text ? `\n正文:\n${text}` : '\n正文暂不可用。'
          return `资料 ${index + 1}:\n${formatMetadata(post)}${body}`
        })
        .join('\n\n')}`
    )
  }

  const directory = posts
    .slice(0, MAX_DIRECTORY_POSTS)
    .map((post, index) => `文章 ${index + 1}:\n${formatMetadata(post)}`)
    .join('\n\n')
  if (directory) sections.push(`本站公开文章目录:\n${directory}`)

  return sections.join('\n\n').slice(0, MAX_CONTEXT_CHARS)
}
