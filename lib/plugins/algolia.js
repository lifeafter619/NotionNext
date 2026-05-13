import BLOG from '@/blog.config'
import algoliasearch from 'algoliasearch'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'

// 全局初始化 Algolia 客户端和索引
let algoliaClient
let algoliaIndex

const initAlgolia = () => {
  if (!algoliaClient) {
    if (
      !BLOG.ALGOLIA_APP_ID ||
      !BLOG.ALGOLIA_ADMIN_APP_KEY ||
      !BLOG.ALGOLIA_INDEX
    ) {
      // console.warn('Algolia configuration is missing')
    }
    algoliaClient = algoliasearch(
      BLOG.ALGOLIA_APP_ID,
      BLOG.ALGOLIA_ADMIN_APP_KEY
    )
    algoliaIndex = algoliaClient.initIndex(BLOG.ALGOLIA_INDEX)
  }
  return { client: algoliaClient, index: algoliaIndex }
}

// 初始化全局实例
initAlgolia()

/**
 * 检查文章是否可被搜索
 * 只有 Published 状态且无密码的文章可被搜索
 * Invisible 和 Draft 状态的文章不能被搜索
 * @param {*} post
 * @returns {boolean}
 */
const isSearchable = post => {
  if (!post) return false
  if (post.password) return false
  // 只有 Published 状态的 Post 和 Page 可被搜索
  return post.status === 'Published' && (post.type === 'Post' || post.type === 'Page')
}

/**
 * 生成全文索引
 * 只索引可搜索的文章（Published状态且无密码）
 * @param {*} allPages
 */
const generateAlgoliaSearch = ({ allPages, force = false }) => {
  allPages?.forEach(p => {
    // 只索引可搜索的文章
    if (isSearchable(p)) {
      uploadDataToAlgolia(p)
    }
  })
}

/**
 * 覆盖Algolia索引
 * 清空所有数据并重新上传，避免残留数据
 * @param {*} posts
 */
const overwriteAlgoliaSearch = async (posts) => {
  if (!posts || posts.length === 0) return

  const objects = []
  for (const post of posts) {
    // 过滤掉没有 slug 或状态不是 Published 的文章
    if (!post.slug || post.status !== 'Published') continue

    const fullContent = post.content && typeof post.content === 'string' ? post.content : getPageContentText(post, post.blockMap)
    const chunks = splitString(fullContent, 2000) // 按2000字符分块

    chunks.forEach((chunk, index) => {
        objects.push({
            objectID: `${post.id}-${index}`,
            title: post.title,
            category: post.category,
            tags: post.tags,
            pageCover: post.pageCover,
            pageCoverThumbnail: post.pageCoverThumbnail,
            slug: post.slug,
            summary: post.summary,
            lastEditedDate: post.lastEditedDate,
            createdTime: post.createdTime,
            publishDate: post.publishDate || post.createdTime,
            lastIndexDate: new Date(),
            createdTimestamp: getValidTimestamp(post.createdTime),
            lastEditedTimestamp: getValidTimestamp(post.lastEditedDate),
            content: chunk,
            chunkIndex: index
        })
    })
  }

  try {
    await algoliaIndex.replaceAllObjects(objects).wait()
    console.log('Algolia索引重置成功，共索引', objects.length, '个分块')
  } catch (error) {
    console.error('Algolia索引重置失败:', error)
  }
}

/**
 * 检查数据是否需要从algolia删除
 * 删除不可搜索的文章（包括 Draft、Invisible 和有密码的文章）
 * @param {*} props
 */
export const checkDataFromAlgolia = async props => {
  const { allPages } = props
  const deletions = (allPages || [])
    .map(p => {
      // 删除所有不可搜索的文章
      if (p && !isSearchable(p)) {
        return deletePostDataFromAlgolia(p)
      }
    })
    .filter(Boolean) // 去除 undefined
  await Promise.all(deletions)
}

/**
 * 删除数据
 * @param post
 */
const deletePostDataFromAlgolia = async post => {
  if (!post) {
    return
  }

  // 检查是否有索引
  let existed
  try {
    existed = await algoliaIndex.getObject(post.id)
  } catch (error) {
    // 通常是不存在索引
  }

  if (existed) {
    await algoliaIndex
      .deleteObject(post.id)
      .wait()
      .then(r => {
        console.log('Algolia索引删除成功', r)
      })
      .catch(err => {
        console.log('Algolia异常', err)
      })
  }
}

/**
 * 上传数据
 * 根据上次修改文章日期和上次更新索引数据判断是否需要更新algolia索引
 */
const uploadDataToAlgolia = async post => {
  if (!post) {
    return
  }

  // 检查是否有索引
  let existed
  let needUpdateIndex = false
  try {
    existed = await algoliaIndex.getObject(post.id)
  } catch (error) {
    // 通常是不存在索引
  }

  if (!existed || !existed?.lastEditedDate || !existed?.lastIndexDate) {
    needUpdateIndex = true
  } else {
    const lastEditedDate = new Date(post.lastEditedDate)
    const lastIndexDate = new Date(existed.lastIndexDate)
    if (lastEditedDate.getTime() > lastIndexDate.getTime()) {
      needUpdateIndex = true
    }
  }

  // 如果需要更新搜索
  if (needUpdateIndex) {
    const record = {
      objectID: post.id,
      title: post.title,
      category: post.category,
      tags: post.tags,
      pageCover: post.pageCover,
      pageCoverThumbnail: post.pageCoverThumbnail,
      slug: post.slug,
      summary: post.summary,
      lastEditedDate: post.lastEditedDate, // 更新文章时间
      createdTime: post.createdTime, // 创建时间（用于排序）
      publishDate: post.publishDate || post.createdTime, // 发布时间
      lastIndexDate: new Date(), // 更新索引时间
      // 将创建时间转换为时间戳，便于排序（带验证）
      createdTimestamp: getValidTimestamp(post.createdTime),
      lastEditedTimestamp: getValidTimestamp(post.lastEditedDate),
      content: truncate(post.content && typeof post.content === 'string' ? post.content : getPageContentText(post, post.blockMap), 5000) // 提高索引字符限制以支持更多内容，需注意Algolia套餐限制
    }
    // console.log('更新Algolia索引', record)
    algoliaIndex
      .saveObject(record)
      .wait()
      .then(r => {
        console.log('Algolia索引更新', r)
      })
      .catch(err => {
        console.log('Algolia异常', err)
      })
  }
}

/**
 * 获取有效的时间戳
 * 验证日期字符串并返回时间戳，无效则返回0
 * @param {*} dateStr
 * @returns {number}
 */
function getValidTimestamp(dateStr) {
  if (!dateStr) return 0
  try {
    const date = new Date(dateStr)
    const timestamp = date.getTime()
    // 检查是否为有效日期（NaN检查）
    return isNaN(timestamp) ? 0 : timestamp
  } catch {
    return 0
  }
}

/**
 * 字符串分块
 * @param {*} str
 * @param {*} chunkSize
 * @returns
 */
function splitString(str, chunkSize) {
    if (!str) return []
    const chunks = []
    for (let i = 0; i < str.length; i += chunkSize) {
        chunks.push(str.substring(i, i + chunkSize))
    }
    return chunks
}

/**
 * 限制内容字节数 (保留此函数以防其他地方调用，但此处主要使用 splitString)
 * @param {*} str
 * @param {*} maxBytes
 * @returns
 */
function truncate(str, maxBytes) {
  let count = 0
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code <= 0x7f) {
      count += 1
    } else if (code <= 0x7ff) {
      count += 2
    } else if (code <= 0xffff) {
      count += 3
    } else {
      count += 4
    }
    if (count <= maxBytes) {
      result += str[i]
    } else {
      break
    }
  }
  return result
}

export { uploadDataToAlgolia, generateAlgoliaSearch, overwriteAlgoliaSearch }
