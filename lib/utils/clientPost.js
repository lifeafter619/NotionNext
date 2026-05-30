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

export function cleanPostListItemForClient(post, options = {}) {
  if (!post || typeof post !== 'object') return post

  const cleanedPost = pickFields(post, CLIENT_POST_LIST_FIELDS)

  if (options.keepBlockMap && post.blockMap) {
    cleanedPost.blockMap = post.blockMap
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
