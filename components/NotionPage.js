import { siteConfig } from '@/lib/config'
import BLOG from '@/blog.config'
import { compressImage, mapImgUrl } from '@/lib/db/notion/mapImage'
import NotionLink from '@/components/NotionLink'
import { isBrowser, loadExternalResource, getImageSrc } from '@/lib/utils'
import { useImageViewerContext } from '@/lib/ImageViewerContext'
import {
  blockMapHasCode,
  restoreCompactBlockMapForRender
} from '@/lib/db/notion/cleanBlockMapForClient'
import NotionButton from '@/components/NotionButton'
import LazyImage from '@/components/LazyImage'
import NotionFile, { buildNotionFileProxyUrl } from '@/components/NotionFile'
import {
  DEFAULT_NOTION_ORIGIN,
  isNotionHostedAssetSource,
  unwrapExternalNotionImageSource
} from '@/lib/notionAssetUrl'
import {
  bindNotionHashScrollHandler,
  scrollToNotionHeading
} from '@/lib/utils/notionHashScroll'
import 'katex/dist/katex.min.css'
import dynamic from 'next/dynamic'
import { useEffect, useCallback, useMemo } from 'react'
import { NotionRenderer, useNotionContext } from 'react-notion-x'

// 阅读进度保存组件
const ReadingPositionSaver = dynamic(
  () => import('@/components/ReadingPositionSaver'),
  { ssr: false }
)

/**
 * 整个站点的核心组件
 * 将Notion数据渲染成网页
 * @param {*} param0
 * @returns
 */
const NotionPage = ({ post, className, contentId = 'notion-article' }) => {
  // 是否关闭数据库和画册的点击跳转
  const POST_DISABLE_GALLERY_CLICK = siteConfig('POST_DISABLE_GALLERY_CLICK')
  const POST_DISABLE_DATABASE_CLICK = siteConfig('POST_DISABLE_DATABASE_CLICK')
  const SPOILER_TEXT_TAG = siteConfig('SPOILER_TEXT_TAG')
  const IMAGE_ZOOM_IN_WIDTH = siteConfig('IMAGE_ZOOM_IN_WIDTH', 1200)
  const READING_PROGRESS_SAVE = siteConfig('READING_PROGRESS_SAVE', true)

  // 使用全局图片查看器
  const { openViewer } = useImageViewerContext()

  // 检查是否包含代码块，优化PrismMac加载
  const hasCode = useMemo(() => {
    // 兼容 post 为 recordMap 或 post 为包含 blockMap 的对象；
    // blockMapHasCode 内部兼容压缩（compact）后的 blockMap（详情页数据均已压缩）
    return blockMapHasCode(post?.blockMap || post)
  }, [post])

  // 处理图片点击事件
  const handleImageClick = useCallback(
    e => {
      const target = e.target
      if (target.tagName === 'IMG' && target.closest('.notion-asset-wrapper')) {
        e.preventDefault()
        e.stopPropagation()

        // 收集所有文章内图片 (排除侧栏和其他非文章主体内容)
        // 使用更精确的选择器，或者过滤掉包含 wow fadeInUp 类（如果是侧栏元素特征）的元素
        // 但 wow fadeInUp 通常是动画类，文章内图片也可能有。
        // 根据用户反馈 "wow fadeInUp 这个里面，也就是侧栏中出现的图片"
        // 我们可以检查元素的祖先是否包含侧栏特定的类名，例如 #side-bar (如果存在)
        // 或者只选择 #notion-article .notion-page-content img (如果结构如此)
        // 目前 #notion-article 包含 NotionRenderer，通常包含文章主体。
        // 如果侧栏图片混入，可能是因为 selector 选到了不该选的。
        // 我们这里加一个简单的过滤：排除 sidebar 内的图片。
        // 假设侧栏 id 是 sideRight 或 side-bar。

        const article = document.getElementById(contentId)
        let allImages = Array.from(
          article?.querySelectorAll('.notion-asset-wrapper img') || []
        )

        // 过滤掉位于侧栏中的图片 (如果侧栏不幸被包含在 #notion-article 中，或者有重叠)
        // 通常 #notion-article 是纯文章内容。如果用户说 "wow fadeInUp 里面... 侧栏中出现的图片"
        // 可能侧栏的部分组件被错误地渲染到了 article 区域，或者选择器范围太大。
        // 无论如何，我们可以过滤掉那些 offsetParent 为 null (不可见) 或者在特定容器内的图片。

        allImages = allImages.filter(img => {
          const sideRight = document.getElementById('sideRight')
          const sideBar = document.getElementById('sideBar') // 假设 ID
          // 如果图片在侧栏内，则排除
          if (sideRight && sideRight.contains(img)) return false
          if (sideBar && sideBar.contains(img)) return false
          return true
        })

        const imageList = allImages.map(img => {
          const src = getImageSrc(img)
          let highResSrc = src
          try {
            const urlObj = new URL(src)
            // Remove resize parameters to get high quality image
            urlObj.searchParams.delete('width')
            urlObj.searchParams.delete('height')
            urlObj.searchParams.delete('quality')
            urlObj.searchParams.delete('fmt')
            urlObj.searchParams.delete('fm') // Unsplash
            urlObj.searchParams.delete('crop')
            urlObj.searchParams.delete('fit')

            // Special handling for Unsplash to ensure high res
            if (src.includes('unsplash.com')) {
              urlObj.searchParams.set('q', '100') // Set max quality
            }

            highResSrc = urlObj.toString()
          } catch (e) {
            // ignore
          }
          return {
            src,
            alt: img.getAttribute('alt') || '',
            highResSrc
          }
        })

        const currentSrc = getImageSrc(target)
        // 修正：确保找到正确的索引
        // 有时候 src 可能经过了处理，这里尝试更宽松的匹配，或者回退到 0
        let currentIndex = imageList.findIndex(item => item.src === currentSrc)
        if (currentIndex === -1) {
          // 尝试通过 highResSrc 匹配 (假设 target 也是原始链接)
          currentIndex = imageList.findIndex(
            item => item.highResSrc === currentSrc
          )
        }
        if (currentIndex === -1) {
          currentIndex = 0 // Fallback
        }

        // 传递图片列表和当前索引
        openViewer(imageList, currentIndex)
      }
    },
    [contentId, openViewer]
  )

  // 页面首次打开时执行的勾子
  useEffect(() => {
    // 检测当前的url并自动滚动到对应目标
    autoScrollToHash()
  }, [])

  useEffect(() => {
    return bindNotionHashScrollHandler()
  }, [post])

  useEffect(() => {
    if (!isBrowser) return

    const article = document.getElementById(contentId)
    if (!article) return

    const handleArticleImageError = event => {
      const target = event.target
      if (target?.tagName === 'IMG') {
        retryImageWithProxyFallback(target)
      }
    }

    article.addEventListener('error', handleArticleImageError, true)
    return () => {
      article.removeEventListener('error', handleArticleImageError, true)
    }
  }, [contentId, post])

  // 页面文章发生变化时会执行的勾子
  useEffect(() => {
    let cleanupGalleryImg = () => {}

    // 相册视图点击禁止跳转，只能放大查看图片
    if (POST_DISABLE_GALLERY_CLICK) {
      // 针对页面中的gallery视图，点击后是放大图片
      cleanupGalleryImg = processGalleryImg(openViewer, IMAGE_ZOOM_IN_WIDTH)
    }

    // 页内数据库点击禁止跳转，只能查看
    if (POST_DISABLE_DATABASE_CLICK) {
      processDisableDatabaseUrl()
    }

    return () => {
      cleanupGalleryImg()
    }
  }, [
    post,
    POST_DISABLE_GALLERY_CLICK,
    POST_DISABLE_DATABASE_CLICK,
    openViewer,
    IMAGE_ZOOM_IN_WIDTH
  ])

  useEffect(() => {
    // Spoiler文本功能
    if (SPOILER_TEXT_TAG) {
      import('lodash/escapeRegExp').then(escapeRegExp => {
        Promise.all([
          loadExternalResource('/js/spoilerText.js', 'js'),
          loadExternalResource('/css/spoiler-text.css', 'css')
        ]).then(() => {
          window.textToSpoiler &&
            window.textToSpoiler(escapeRegExp.default(SPOILER_TEXT_TAG))
        })
      })
    }

    // 查找所有具有 'notion-collection-page-properties' 类的元素,删除notion自带的页面properties
    const timer = setTimeout(() => {
      // 查找所有具有 'notion-collection-page-properties' 类的元素
      const elements = document.querySelectorAll(
        '.notion-collection-page-properties'
      )

      // 遍历这些元素并将其从 DOM 中移除
      elements?.forEach(element => {
        element?.remove()
      })
    }, 1000) // 1000 毫秒 = 1 秒

    // 清理定时器，防止组件卸载时执行
    return () => clearTimeout(timer)
  }, [post, SPOILER_TEXT_TAG])

  const cleanBlockMap = useMemo(() => {
    return post?.blockMap
      ? proxyNotionVideoUrls(
          cleanBlocksForRender(post.blockMap),
          BLOG.NOTION_HOST
        )
      : post?.blockMap
  }, [post?.blockMap])

  const enableReadingPosition = useMemo(() => {
    return shouldEnableReadingPositionSaver(post, READING_PROGRESS_SAVE)
  }, [post, READING_PROGRESS_SAVE])

  return (
    <>
      <div
        id={contentId}
        className={`mx-auto overflow-hidden ${className || ''}`}
        onClick={handleImageClick}>
        <NotionRenderer
          recordMap={cleanBlockMap}
          mapPageUrl={mapPageUrl}
          mapImageUrl={mapImgUrl}
          forceCustomImages
          components={{
            Button: NotionButton,
            Code,
            Collection,
            Embed: NotionEmbed,
            Equation,
            File: NotionFile,
            Image: NotionImage,
            Link: NotionLink,
            Modal,
            Pdf,
            Quote: NotionQuote,
            Tweet
          }}
        />

        <AdEmbed />
        {hasCode && <PrismMac />}
      </div>
      <ReadingPositionSaver postId={post?.id} enabled={enableReadingPosition} />
    </>
  )
}

export function NotionImage(props) {
  return <LazyImage {...props} referrerPolicy='no-referrer' />
}

function shouldEnableReadingPositionSaver(post, enabled) {
  if (!enabled || !isBrowser || !post?.id) return false

  const currentPath = getNormalizedCurrentPath()
  const normalizedPostId = String(post.id)
  const candidates = [
    post.slug,
    post.href,
    normalizedPostId,
    normalizedPostId.replace(/-/g, '')
  ]
    .filter(Boolean)
    .map(normalizePathCandidate)
    .filter(Boolean)

  return candidates.some(candidate => currentPath.includes(candidate))
}

function getNormalizedCurrentPath() {
  try {
    return decodeURIComponent(window.location.pathname).toLowerCase()
  } catch {
    return window.location.pathname.toLowerCase()
  }
}

function normalizePathCandidate(value) {
  return String(value)
    .split('?')[0]
    .split('#')[0]
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()
}

export function cleanBlocksForRender(blockMap) {
  const cleanedBlocks = {}
  const removedBlockIds = new Set()
  const restoredBlockMap = restoreCompactBlockMapForRender(blockMap)
  const sourceBlocks = restoredBlockMap.block || {}

  for (const [id, block] of Object.entries(sourceBlocks)) {
    const normalizedBlock = normalizeRenderableBlock(block, restoredBlockMap)
    if (
      !normalizedBlock?.value?.id ||
      isUnrenderableCollectionView(normalizedBlock.value, restoredBlockMap)
    ) {
      removedBlockIds.add(id)
      continue
    }

    cleanedBlocks[id] = normalizedBlock
  }

  for (const [id, block] of Object.entries(cleanedBlocks)) {
    const newBlock = { ...block, value: { ...block.value } }
    if (Array.isArray(newBlock.value.content)) {
      // 递归清理 content 中无效的 blockId
      newBlock.value.content = newBlock.value.content.filter(cid => {
        if (!cleanedBlocks[cid]?.value?.id) {
          removedBlockIds.add(cid)
          return false
        }
        return true
      })
    }

    cleanedBlocks[id] = newBlock
  }

  if (removedBlockIds.size && process.env.NODE_ENV === 'development') {
    console.warn('Removed invalid blocks:', Array.from(removedBlockIds))
  }

  return {
    ...restoredBlockMap,
    block: cleanedBlocks
  }
}

export function proxyNotionVideoUrls(blockMap, notionHost = BLOG.NOTION_HOST) {
  if (!blockMap?.block || !blockMap?.signed_urls) return blockMap

  let signedUrls = blockMap.signed_urls

  for (const entry of Object.values(blockMap.block)) {
    const block = getNotionValue(entry)
    if (!['video', 'audio'].includes(block?.type) || !block.id) continue

    const stableSource =
      block.properties?.source?.[0]?.[0] || block.format?.display_source
    const proxyUrl = buildNotionFileProxyUrl({
      id: block.id,
      source: stableSource,
      notionHost
    })
    if (!proxyUrl || proxyUrl === signedUrls[block.id]) continue

    if (signedUrls === blockMap.signed_urls) {
      signedUrls = { ...blockMap.signed_urls }
    }
    signedUrls[block.id] = proxyUrl
  }

  return signedUrls === blockMap.signed_urls
    ? blockMap
    : { ...blockMap, signed_urls: signedUrls }
}

function normalizeRenderableBlock(block, blockMap) {
  if (block?.value?.type !== 'collection_view') return { ...block }

  const renderableViewId = findRenderableCollectionViewId(block.value, blockMap)
  if (!renderableViewId || block.value.view_ids?.[0] === renderableViewId) {
    return { ...block }
  }

  return {
    ...block,
    value: {
      ...block.value,
      view_ids: [
        renderableViewId,
        ...block.value.view_ids.filter(viewId => viewId !== renderableViewId)
      ]
    }
  }
}

function isUnrenderableCollectionView(blockValue, blockMap) {
  if (blockValue?.type !== 'collection_view') return false

  return !findRenderableCollectionViewId(blockValue, blockMap)
}

function findRenderableCollectionViewId(blockValue, blockMap) {
  const viewIds = Array.isArray(blockValue.view_ids) ? blockValue.view_ids : []

  return (
    viewIds.find(viewId => {
      if (!viewId) return false

      const collectionId = getCollectionId(blockValue, blockMap, viewId)
      if (!collectionId) return false

      return (
        getNotionValue(blockMap.collection?.[collectionId]) &&
        getNotionValue(blockMap.collection_view?.[viewId]) &&
        blockMap.collection_query?.[collectionId]?.[viewId]
      )
    }) || null
  )
}

function getCollectionId(blockValue, blockMap, collectionViewId) {
  const directCollectionId =
    blockValue.collection_id || blockValue.format?.collection_pointer?.id

  if (directCollectionId) return directCollectionId

  const collectionView = getNotionValue(
    blockMap.collection_view?.[collectionViewId]
  )
  return collectionView?.format?.collection_pointer?.id || null
}

function getNotionValue(record) {
  if (!record) return undefined
  if (record.value) return getNotionValue(record.value)
  return record.id ? record : undefined
}

const NotionEmbed = ({ block }) => {
  const { recordMap } = useNotionContext()
  const source =
    recordMap?.signed_urls?.[block?.id] ||
    block?.format?.display_source ||
    block?.properties?.source?.[0]?.[0]
  const isHtmlArtifact =
    block?.type === 'embed' && block?.format?.embed_variant === 'html_artifact'
  const srcDoc = isHtmlArtifact
    ? block?.format?.html_artifact_content
    : undefined

  if (!srcDoc && (!source || source.startsWith('attachment:'))) return null

  const height = block?.format?.block_height || (isHtmlArtifact ? 640 : 480)
  const title =
    block?.properties?.title?.[0]?.[0] ||
    (isHtmlArtifact ? 'Notion HTML block' : 'iframe embed')

  return (
    <figure className='notion-asset-wrapper notion-asset-wrapper-embed'>
      <div style={{ height, position: 'relative' }}>
        <iframe
          className='notion-asset-object-fit'
          src={srcDoc ? undefined : source}
          srcDoc={srcDoc}
          title={title}
          frameBorder='0'
          loading='lazy'
          scrolling='auto'
          allowFullScreen={!isHtmlArtifact}
          sandbox={
            isHtmlArtifact
              ? 'allow-scripts allow-forms allow-popups'
              : undefined
          }
        />
      </div>
    </figure>
  )
}

/**
 * 页面的数据库链接禁止跳转，只能查看
 */
const processDisableDatabaseUrl = () => {
  if (isBrowser) {
    const links = document.querySelectorAll('.notion-table a')
    for (const e of links) {
      e.removeAttribute('href')
    }
  }
}

/**
 * gallery视图，点击后是放大图片
 */
const processGalleryImg = (openViewer, imageZoomWidth) => {
  if (!isBrowser) return () => {}

  const cleanupListeners = []
  const timer = setTimeout(() => {
    const imgList = document?.querySelectorAll(
      '.notion-collection-card-cover img'
    )
    if (imgList) {
      for (let i = 0; i < imgList.length; i++) {
        const img = imgList[i]
        if (img.dataset.notionNextGalleryBound === 'true') continue

        const handleClick = e => {
          e.preventDefault()
          e.stopPropagation()
          const src = getImageSrc(img)
          const highResSrc = compressImage(src, imageZoomWidth)
          const alt = img.getAttribute('alt') || ''
          openViewer([{ src, alt, highResSrc }], 0)
        }

        img.dataset.notionNextGalleryBound = 'true'
        img.style.cursor = 'zoom-in'
        img.addEventListener('click', handleClick)
        cleanupListeners.push(() => {
          img.removeEventListener('click', handleClick)
          delete img.dataset.notionNextGalleryBound
        })
      }
    }

    const cards = document.getElementsByClassName('notion-collection-card')
    for (const e of cards) {
      e.removeAttribute('href')
    }
  }, 800)

  return () => {
    clearTimeout(timer)
    cleanupListeners.forEach(cleanup => cleanup())
  }
}

/**
 * 根据url参数自动滚动到锚位置
 */
const autoScrollToHash = () => {
  setTimeout(() => {
    // 跳转到指定标题
    const hash = window?.location?.hash
    const needToJumpToTitle = hash && hash.length > 0
    if (needToJumpToTitle) {
      scrollToNotionHeading(hash)
    }
  }, 180)
}

/**
 * 将id映射成博文内部链接。
 * @param {*} id
 * @returns
 */
const mapPageUrl = id => {
  // return 'https://www.notion.so/' + id.replace(/-/g, '')
  return '/' + id.replace(/-/g, '')
}

export function retryImageWithProxyFallback(
  img,
  notionHost = BLOG.NOTION_HOST
) {
  const source = getImageSrc(img)
  if (!source) {
    return false
  }

  const originalSource = getOriginalNotionImageSource(source, notionHost)
  if (originalSource && img?.dataset?.notionNextOriginRetried !== 'true') {
    img.dataset.notionNextOriginRetried = 'true'
    img.removeAttribute('srcset')
    img.setAttribute('src', originalSource)
    return true
  }

  if (!isProxiableNotionImageSource(source)) {
    return retryExternalImageWithoutReferrer(img, source)
  }

  if (img?.dataset?.notionNextProxyRetried === 'true') {
    return false
  }

  img.dataset.notionNextProxyRetried = 'true'
  img.removeAttribute('srcset')
  img.setAttribute('src', `/api/proxy-image?url=${encodeURIComponent(source)}`)
  return true
}

const DEFAULT_NOTION_IMAGE_HOST = DEFAULT_NOTION_ORIGIN

export function getOriginalNotionImageSource(source, notionHost) {
  if (!source || !notionHost) return null

  const externalSource = unwrapExternalNotionImageSource(source, notionHost)
  if (externalSource) return externalSource

  try {
    const sourceUrl = new URL(source)
    const configuredUrl = new URL(notionHost)
    if (
      sourceUrl.origin === configuredUrl.origin &&
      configuredUrl.origin !== DEFAULT_NOTION_IMAGE_HOST
    ) {
      const originalUrl = new URL(
        sourceUrl.pathname + sourceUrl.search + sourceUrl.hash,
        DEFAULT_NOTION_IMAGE_HOST
      ).toString()
      return isNotionHostedAssetSource(originalUrl) ? originalUrl : null
    }
  } catch {
    return null
  }

  return null
}

function isProxiableNotionImageSource(source) {
  return isNotionHostedAssetSource(source)
}

function retryExternalImageWithoutReferrer(img, source) {
  if (
    img?.dataset?.notionNextNoReferrerRetried === 'true' ||
    !isHttpImageSource(source)
  ) {
    return false
  }

  img.dataset.notionNextNoReferrerRetried = 'true'
  img.referrerPolicy = 'no-referrer'
  img.removeAttribute('srcset')
  img.setAttribute('src', source)
  return true
}

function isHttpImageSource(source) {
  try {
    const url = new URL(source)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

// 代码
const Code = dynamic(
  () =>
    import('react-notion-x/build/third-party/code').then(m => {
      return m.Code
    }),
  { ssr: false }
)

// 公式
const Equation = dynamic(
  () =>
    import('@/components/Equation').then(async m => {
      // 化学方程式
      await import('@/lib/plugins/mhchem')
      return m.Equation
    }),
  { ssr: false }
)

// 原版文档
// const Pdf = dynamic(
//   () => import('react-notion-x/build/third-party/pdf').then(m => m.Pdf),
//   {
//     ssr: false
//   }
// )
const Pdf = dynamic(() => import('@/components/Pdf').then(m => m.Pdf), {
  ssr: false
})

// 美化代码 from: https://github.com/txs
const PrismMac = dynamic(() => import('@/components/PrismMac'), {
  ssr: false
})

/**
 * tweet嵌入
 */
const TweetEmbed = dynamic(() => import('react-tweet-embed'), {
  ssr: false
})

/**
 * 文内google广告
 */
const AdEmbed = dynamic(
  () => import('@/components/GoogleAdsense').then(m => m.AdEmbed),
  { ssr: true }
)

const Collection = dynamic(
  () =>
    import('react-notion-x/build/third-party/collection').then(
      m => m.Collection
    ),
  {
    ssr: true
  }
)

const Modal = dynamic(
  () => import('react-notion-x/build/third-party/modal').then(m => m.Modal),
  { ssr: false }
)

const Tweet = ({ id }) => {
  return <TweetEmbed tweetId={id} />
}

// Custom Quote override: react-notion-x drops quotes without properties.title
// (returns null from early guard). This renders them correctly — fixes #4140.
const NotionQuote = ({ block, children }) => {
  const title = block?.properties?.title
  return (
    <blockquote className='notion-quote'>
      {title && <NotionText value={title} />}
      {children}
    </blockquote>
  )
}

// Minimal inline text renderer for Notion rich-text arrays.
// Each segment is [plainText, [[formatType, optionalValue], ...]].
const NotionText = ({ value }) => {
  if (!Array.isArray(value)) return null
  return value.map((segment, i) => {
    if (!Array.isArray(segment) || !segment[0]) return null
    const [text, formats] = segment
    let element = <>{text}</>
    if (Array.isArray(formats)) {
      for (const fmt of formats) {
        const type = Array.isArray(fmt) ? fmt[0] : fmt
        if (type === 'b') element = <strong>{element}</strong>
        else if (type === 'i') element = <em>{element}</em>
        else if (type === 's') element = <s>{element}</s>
        else if (type === 'c') element = <code>{element}</code>
        else if (type === 'a') {
          element = <a href={getSafeNotionHref(fmt?.[1])}>{element}</a>
        }
      }
    }
    return <span key={i}>{element}</span>
  })
}

function getSafeNotionHref(value) {
  if (typeof value !== 'string') return '#'
  if (value.startsWith('/') || value.startsWith('#')) return value

  try {
    const url = new URL(value)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)
      ? value
      : '#'
  } catch {
    return '#'
  }
}

export default NotionPage
