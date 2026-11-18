import { adjustImgSize, buildResponsiveSrcSet } from '@/components/LazyImage'
import { siteConfig } from '@/lib/config'

/**
 * 文章资源意图预热
 *
 * 用户 hover / touchstart 文章卡片时，说明即将打开该文章。此时：
 * - next/link 已自动预取路由 JSON 与代码分块；
 * - 这里补上文章页首屏最大的资源 —— 头图（PostHeader 封面），
 *   与文章页使用完全一致的 src/srcset/sizes，保证预热的正是
 *   导航后浏览器将要选中的那个候选 URL，点击后头图直接命中缓存。
 *
 * 弱网（2g）与省流（Save-Data）下自动跳过；同一封面只预热一次。
 */

// 与 themes/heo/components/PostHeader.js 的封面 sizes 保持一致。
// 封面在文章页作为 blur(15px) 的背景层展示，较小的候选宽度在视觉上
// 无差别，却能显著减少文章打开时的首屏字节。
export const ARTICLE_COVER_SIZES = '(min-width: 1024px) 50vw, 90vw'

const warmedCovers = new Set()

function shouldSkipWarmup() {
  if (typeof window === 'undefined') return true
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection
  if (connection) {
    if (connection.saveData) return true
    if (String(connection.effectiveType || '').includes('2g')) return true
  }
  return false
}

/**
 * 预热一篇文章的头图
 * @param {*} post 列表数据中的文章对象（含 pageCover / pageCoverThumbnail）
 */
export function warmArticleCover(post) {
  if (shouldSkipWarmup() || !post) return

  const cover = post.pageCover || post.pageCoverThumbnail
  if (!cover || String(cover).startsWith('data:')) return

  const maxWidth = siteConfig('IMAGE_COMPRESS_WIDTH')
  const src = adjustImgSize(cover, maxWidth) || cover
  if (warmedCovers.has(src)) return
  warmedCovers.add(src)

  const image = new Image()
  image.decoding = 'async'
  image.referrerPolicy = 'no-referrer'
  const srcSet = buildResponsiveSrcSet(src, maxWidth)
  if (srcSet) {
    image.sizes = ARTICLE_COVER_SIZES
    image.srcset = srcSet
  }
  image.src = src
}

/** 仅供测试使用 */
export const __warmArticleAssetsTestHooks = {
  reset() {
    warmedCovers.clear()
  },
  warmedCount() {
    return warmedCovers.size
  }
}
