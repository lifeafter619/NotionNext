import {
  cleanBlockMapForClient,
  compactBlockMapForClient
} from '@/lib/db/notion/cleanBlockMapForClient'

const CLIENT_POST_LIST_FIELDS = [
  'id',
  'title',
  'name',
  'slug',
  'href',
  'type',
  'status',
  'summary',
  'category',
  'tags',
  'tagItems',
  'date',
  'createdTime',
  'publishDate',
  'publishDay',
  'lastEditedDate',
  'lastEditedDay',
  'pageIcon',
  'pageCover',
  'pageCoverThumbnail',
  'ext',
  'target',
  'fullWidth',
  'comment'
]

const CLIENT_NAV_POST_FIELDS = [...CLIENT_POST_LIST_FIELDS, 'short_id']

const CLIENT_MENU_FIELDS = [
  'id',
  'name',
  'title',
  'label',
  'icon',
  'href',
  'url',
  'target',
  'show',
  'slot'
]

const SERVER_ONLY_POST_FIELDS = ['password', 'content', 'toc', 'blockMap']

// 列表数据里的重型字段；password 需保留在 allPages 中供文章详情页的解锁流程使用，
// 各页面出口均通过 cleanPostListForClient/pickFields 挑选字段，不会把 password 发给客户端
const HEAVY_POST_FIELDS = ['content', 'toc', 'blockMap']

export function cleanPostListItemForClient(post, options = {}) {
  if (!post || typeof post !== 'object') return post

  const fields = options.keepShortId
    ? CLIENT_NAV_POST_FIELDS
    : CLIENT_POST_LIST_FIELDS
  const cleanedPost = pickFields(post, fields)

  if (options.keepBlockMap && post.blockMap) {
    cleanedPost.blockMap = compactBlockMapForClient(
      cleanBlockMapForClient(post.blockMap)
    )
  }
  if (options.keepContent && post.content !== undefined) {
    cleanedPost.content = post.content
  }
  if (options.keepResults && post.results !== undefined) {
    cleanedPost.results = post.results
  }

  return cleanedPost
}

export function cleanPostListForClient(posts, options = {}) {
  if (!Array.isArray(posts)) return posts || []
  return posts.map(post => cleanPostListItemForClient(post, options))
}

export function selectCategoryPreviewPostsForClient(
  posts,
  categoryOptions,
  limitPerCategory = 4
) {
  if (!Array.isArray(posts) || !Array.isArray(categoryOptions)) return []

  const categoryNames = new Set(
    categoryOptions.map(category => category?.name).filter(Boolean)
  )
  const counts = new Map()
  const selected = []

  for (const post of posts) {
    const category = post?.category
    if (
      post?.status !== 'Published' ||
      !categoryNames.has(category) ||
      (counts.get(category) || 0) >= limitPerCategory
    ) {
      continue
    }
    counts.set(category, (counts.get(category) || 0) + 1)
    selected.push(post)
  }

  return cleanPostListForClient(selected)
}

export function stripServerOnlyPostFields(post) {
  if (!post || typeof post !== 'object') return post

  const cleanedPost = { ...post }
  SERVER_ONLY_POST_FIELDS.forEach(field => {
    delete cleanedPost[field]
  })
  return cleanedPost
}

export function stripServerOnlyPostFieldsFromList(posts) {
  if (!Array.isArray(posts)) return posts || []
  return posts.map(post => stripServerOnlyPostFields(post))
}

export function stripHeavyPostFields(post) {
  if (!post || typeof post !== 'object') return post

  const cleanedPost = { ...post }
  HEAVY_POST_FIELDS.forEach(field => {
    delete cleanedPost[field]
  })
  return cleanedPost
}

export function stripHeavyPostFieldsFromList(posts) {
  if (!Array.isArray(posts)) return posts || []
  return posts.map(post => stripHeavyPostFields(post))
}

export function cleanMenuItemsForClient(items) {
  if (!Array.isArray(items)) return items || []

  return items.map(item => {
    if (!item || typeof item !== 'object') return item

    const cleanedItem = pickFields(item, CLIENT_MENU_FIELDS)
    if (Array.isArray(item.subMenus)) {
      cleanedItem.subMenus = cleanMenuItemsForClient(item.subMenus)
    }
    if (Array.isArray(item.children)) {
      cleanedItem.children = cleanMenuItemsForClient(item.children)
    }

    return cleanedItem
  })
}

function pickFields(source, fields) {
  const target = {}

  fields.forEach(field => {
    if (source[field] !== undefined) {
      target[field] = source[field]
    }
  })

  return target
}
