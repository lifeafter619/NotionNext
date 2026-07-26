import { siteConfig } from '@/lib/config'
import BLOG from '@/blog.config'
import { buildNotionAssetFallbackCandidates } from '@/lib/notionAssetFallback'
import { enqueueImagePrefetch } from '@/lib/utils/imagePrefetchQueue'
import Head from 'next/head'
import { useCallback, useEffect, useRef, useState } from 'react'

const getImageTargetWidth = (width, maxWidth) => {
  const parsedWidth = Number(width)
  const parsedMaxWidth = Number(maxWidth)

  if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
    return Number.isFinite(parsedMaxWidth) && parsedMaxWidth > 0
      ? Math.min(parsedWidth, parsedMaxWidth)
      : parsedWidth
  }

  return maxWidth
}

/**
 * 图片懒加载
 *
 * 所有图片都在服务端直出真实 src，加载策略交给浏览器原生调度：
 * - priority / eager 图片：loading=eager（+ priority 时 preload、fetchpriority=high）；
 * - 其余图片：loading=lazy，浏览器在 HTML 解析阶段就为视口内及附近的图片发起
 *   并行请求（自带并发与优先级控制），无需等待 JS 下载与 React 水合；
 * - 远离视口的图片由原生 lazy 推迟，并进入空闲预取队列在首屏就绪后预热，
 *   用户滚动到时直接命中 HTTP 缓存。
 * @param {*} param0
 * @returns
 */
export default function LazyImage({
  priority,
  id,
  src,
  alt,
  fallbackSrc,
  placeholderSrc,
  className,
  width,
  height,
  title,
  onLoad,
  onError,
  onClick,
  style,
  sizes,
  loading,
  fetchPriority,
  referrerPolicy = 'no-referrer'
}) {
  const maxWidth = siteConfig('IMAGE_COMPRESS_WIDTH')
  const targetImageWidth = getImageTargetWidth(width, maxWidth)
  const defaultPlaceholderSrc = siteConfig('IMG_LAZY_LOAD_PLACEHOLDER')
  const optimizedImageSrc = adjustImgSize(src, targetImageWidth) || src
  const isEager = Boolean(priority || loading === 'eager')
  const imageRef = useRef(null)
  const fallbackIndexRef = useRef(0)
  const cancelPrefetchRef = useRef(null)
  const [currentSrc, setCurrentSrc] = useState(
    optimizedImageSrc || placeholderSrc || defaultPlaceholderSrc
  )
  const [imageLoaded, setImageLoaded] = useState(Boolean(isEager && src))

  const handleImageError = useCallback(() => {
    const fallbackCandidates = getFallbackCandidates([
      fallbackSrc,
      // 让 Notion 图片先走可恢复的真实资源，再使用视觉占位图。否则占位图
      // 一旦加载成功，服务端代理和 notion.so 兜底永远不会被尝试。
      ...buildNotionAssetFallbackCandidates({
        src: optimizedImageSrc || src,
        kind: 'image',
        notionHost: BLOG.NOTION_HOST
      }).map(c => c.url),
      placeholderSrc,
      defaultPlaceholderSrc
    ])
    let nextFallbackSrc = null

    while (fallbackIndexRef.current < fallbackCandidates.length) {
      const candidate = fallbackCandidates[fallbackIndexRef.current]
      fallbackIndexRef.current += 1
      if (candidate !== currentSrc) {
        nextFallbackSrc = candidate
        break
      }
    }

    if (imageRef.current) {
      if (nextFallbackSrc) {
        setCurrentSrc(nextFallbackSrc)
      }
      setImageLoaded(true)
      imageRef.current.classList.remove('lazy-image-placeholder')
    }
    if (typeof onError === 'function') {
      onError()
    }
  }, [
    currentSrc,
    defaultPlaceholderSrc,
    fallbackSrc,
    onError,
    optimizedImageSrc,
    placeholderSrc,
    src
  ])

  const handleImageLoaded = useCallback(
    event => {
      if (currentSrc !== optimizedImageSrc) return

      fallbackIndexRef.current = 0
      // 图片已由浏览器真实加载，空闲队列中的同图预热不再必要
      if (cancelPrefetchRef.current) {
        cancelPrefetchRef.current()
        cancelPrefetchRef.current = null
      }
      if (typeof onLoad === 'function') {
        onLoad(event)
      }
      setImageLoaded(true)
      if (imageRef.current) {
        imageRef.current.classList.remove('lazy-image-placeholder')
      }
    },
    [currentSrc, onLoad, optimizedImageSrc]
  )

  useEffect(() => {
    fallbackIndexRef.current = 0
    setCurrentSrc(optimizedImageSrc || placeholderSrc || defaultPlaceholderSrc)

    // 原生加载可能在 React 水合前就完成（此时不会触发 React 的 onLoad），
    // 这里用 complete 补一次状态同步，移除占位样式。
    const imageElement = imageRef.current
    if (
      imageElement &&
      imageElement.complete &&
      imageElement.naturalWidth > 0
    ) {
      setImageLoaded(true)
      imageElement.classList.remove('lazy-image-placeholder')
    }
  }, [optimizedImageSrc, defaultPlaceholderSrc, placeholderSrc])

  // 构造 srcset 以支持响应式图片加载
  const generateSrcSet = imageSrc => buildResponsiveSrcSet(imageSrc, maxWidth)

  const shouldAttachRealSources = currentSrc === optimizedImageSrc
  const srcSet = shouldAttachRealSources
    ? generateSrcSet(optimizedImageSrc)
    : undefined
  const normalizedWidth = normalizeDimensionAttribute(width)
  const normalizedHeight = normalizeDimensionAttribute(height)
  const imageSizes = sizes || getDefaultImageSizes(normalizedWidth)

  // 非优先图片加入空闲预取队列：首屏加载完成后由队列以受限并发在后台预热
  // 尚未被原生 lazy 拉取的远视口图片，用户滚动到时直接命中 HTTP 缓存即时显示；
  // 图片真实加载完成或组件卸载（路由切换）时自动取消
  useEffect(() => {
    if (isEager || !optimizedImageSrc) return undefined
    const imageElement = imageRef.current
    if (
      imageElement &&
      imageElement.complete &&
      imageElement.naturalWidth > 0
    ) {
      return undefined
    }
    const cancel = enqueueImagePrefetch({
      src: optimizedImageSrc,
      srcSet: buildResponsiveSrcSet(optimizedImageSrc, maxWidth),
      sizes: imageSizes,
      referrerPolicy
    })
    cancelPrefetchRef.current = cancel
    return () => {
      cancelPrefetchRef.current = null
      cancel()
    }
  }, [isEager, optimizedImageSrc, maxWidth, imageSizes, referrerPolicy])

  // 动态添加width、height和className属性，仅在它们为有效值时添加
  const imgProps = {
    ref: imageRef,
    src: currentSrc,
    srcSet,
    sizes: imageSizes,
    'data-src': src, // 存储原始图片地址
    alt: alt ?? '',
    onLoad: handleImageLoaded,
    onError: handleImageError,
    className: `${className || ''}${imageLoaded ? '' : ' lazy-image-placeholder'}`,
    style: {
      aspectRatio: width && height ? `${width} / ${height}` : undefined,
      containIntrinsicSize: width || height ? undefined : '300px 200px',
      ...style
    },
    onClick,
    // 性能优化属性
    loading: isEager ? 'eager' : 'lazy',
    fetchpriority: priority ? 'high' : fetchPriority || undefined,
    decoding: 'async',
    // Do not leak the blog domain to image hosts. This also prevents generic
    // hotlink-protection rules from blocking custom CDN and Vercel domains.
    referrerPolicy,
    // NotionPage has a capture-phase fallback for raw images. Mark this image
    // so the React state machine remains its single owner.
    'data-notion-next-fallback-managed': 'true',
    // 现代图片格式支持
    ...(siteConfig('WEBP_SUPPORT') && { 'data-webp': true }),
    ...(siteConfig('AVIF_SUPPORT') && { 'data-avif': true })
  }

  if (id) imgProps.id = id
  if (title) imgProps.title = title
  if (normalizedWidth !== undefined) imgProps.width = normalizedWidth
  if (normalizedHeight !== undefined) imgProps.height = normalizedHeight

  if (!src) {
    return null
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={imgProps.alt} {...imgProps} />
      {/* 预加载 */}
      {priority && (
        <Head>
          <link
            rel='preload'
            as='image'
            href={optimizedImageSrc}
            imageSrcSet={srcSet}
            imageSizes={imgProps.sizes}
            fetchpriority='high'
            referrerPolicy={referrerPolicy}
          />
        </Head>
      )}
    </>
  )
}

function getFallbackCandidates(candidates) {
  return [...new Set(candidates.filter(Boolean))]
}

function normalizeDimensionAttribute(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return value
  }

  return undefined
}

function getDefaultImageSizes(width) {
  if (width === undefined) {
    return '100vw'
  }

  return `${width}px`
}

export function adjustImgSize(src, maxWidth) {
  if (!src) {
    return null
  }

  return replaceImageWidthParam(src, normalizeImageWidth(maxWidth))
}

function normalizeImageWidth(width) {
  const numericWidth = Number(width)
  if (Number.isFinite(numericWidth) && numericWidth > 0) {
    return numericWidth
  }
  return 1080
}

export function buildResponsiveSrcSet(imageSrc, maxWidth) {
  if (!imageSrc || (!imageSrc.includes('width=') && !imageSrc.includes('w='))) {
    return undefined
  }

  const breakpoints = [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]
  const maxImageWidth = normalizeImageWidth(maxWidth)

  return breakpoints
    .filter(w => w <= maxImageWidth)
    .map(w => {
      const newSrc = replaceImageWidthParam(imageSrc, w)
      return `${newSrc} ${w}w`
    })
    .join(', ')
}

function replaceImageWidthParam(imageSrc, width) {
  if (!imageSrc || (!imageSrc.includes('width=') && !imageSrc.includes('w='))) {
    return imageSrc
  }

  try {
    const isRelativePath =
      imageSrc.startsWith('/') && !imageSrc.startsWith('//')
    const url = new URL(
      imageSrc,
      isRelativePath ? 'https://notionnext.local' : undefined
    )
    const widthParam = url.searchParams.has('width')
      ? 'width'
      : url.searchParams.has('w')
        ? 'w'
        : null

    if (!widthParam) {
      return imageSrc
    }

    url.searchParams.set(widthParam, String(width))

    if (isRelativePath) {
      return `${url.pathname}${url.search}${url.hash}`
    }

    return url.toString()
  } catch (_) {
    return imageSrc
      .replace(/width=\d+/, `width=${width}`)
      .replace(/w=\d+/, `w=${width}`)
  }
}
