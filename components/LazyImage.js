import { siteConfig } from '@/lib/config'
import Head from 'next/head'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 图片懒加载
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
  sizes
}) {
  const maxWidth = siteConfig('IMAGE_COMPRESS_WIDTH')
  const defaultPlaceholderSrc = siteConfig('IMG_LAZY_LOAD_PLACEHOLDER')
  const placeholderImageSrc = placeholderSrc || defaultPlaceholderSrc
  const optimizedImageSrc = adjustImgSize(src, maxWidth) || src
  const initialImageSrc = priority
    ? optimizedImageSrc || placeholderImageSrc
    : placeholderImageSrc
  const imageRef = useRef(null)
  const fallbackIndexRef = useRef(0)
  const [currentSrc, setCurrentSrc] = useState(initialImageSrc)

  /**
   * 占位图加载成功
   */
  const handleThumbnailLoaded = () => {
    if (typeof onLoad === 'function') {
      // onLoad() // 触发传递的onLoad回调函数
    }
  }

  const handleImageError = useCallback(() => {
    const fallbackCandidates = getFallbackCandidates([
      fallbackSrc,
      placeholderSrc,
      defaultPlaceholderSrc
    ])
    const nextFallbackSrc =
      fallbackCandidates[
        Math.min(fallbackIndexRef.current, fallbackCandidates.length - 1)
      ]
    fallbackIndexRef.current += 1

    if (imageRef.current) {
      if (nextFallbackSrc) {
        imageRef.current.src = nextFallbackSrc
        setCurrentSrc(nextFallbackSrc)
      }
      imageRef.current.classList.remove('lazy-image-placeholder')
    }
    if (typeof onError === 'function') {
      onError()
    }
  }, [defaultPlaceholderSrc, fallbackSrc, onError, placeholderSrc])

  useEffect(() => {
    const adjustedImageSrc = optimizedImageSrc || defaultPlaceholderSrc
    const imageElement = imageRef.current
    const handleImageLoaded = () => {
      fallbackIndexRef.current = 0
      if (typeof onLoad === 'function') {
        onLoad()
      }
      if (imageRef.current) {
        imageRef.current.classList.remove('lazy-image-placeholder')
      }
    }

    // 如果是优先级图片，直接加载
    if (priority) {
      const img = new Image()
      img.src = adjustedImageSrc
      img.onload = () => {
        setCurrentSrc(adjustedImageSrc)
        handleImageLoaded(adjustedImageSrc)
      }
      img.onerror = handleImageError
      return
    }

    // 检查浏览器是否支持IntersectionObserver
    if (!window.IntersectionObserver) {
      // 降级处理：直接加载图片
      const img = new Image()
      img.src = adjustedImageSrc
      img.onload = () => {
        setCurrentSrc(adjustedImageSrc)
        handleImageLoaded(adjustedImageSrc)
      }
      img.onerror = handleImageError
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 预加载图片
            const img = new Image()
            // 设置图片解码优先级
            if ('decoding' in img) {
              img.decoding = 'async'
            }
            img.src = adjustedImageSrc
            img.onload = () => {
              setCurrentSrc(adjustedImageSrc)
              handleImageLoaded(adjustedImageSrc)
            }
            img.onerror = handleImageError

            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: siteConfig('LAZY_LOAD_THRESHOLD', '200px'),
        threshold: 0.1
      }
    )

    if (imageElement) {
      observer.observe(imageElement)
    }

    return () => {
      if (imageElement) {
        observer.unobserve(imageElement)
      }
    }
  }, [
    maxWidth,
    optimizedImageSrc,
    src,
    priority,
    defaultPlaceholderSrc,
    fallbackSrc,
    handleImageError,
    onLoad,
    placeholderSrc
  ])

  // 构造 srcset 以支持响应式图片加载
  const generateSrcSet = imageSrc => {
    if (
      !imageSrc ||
      (!imageSrc.includes('width=') && !imageSrc.includes('w='))
    ) {
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

  const shouldAttachRealSources = priority || currentSrc === optimizedImageSrc
  const srcSet = shouldAttachRealSources
    ? generateSrcSet(optimizedImageSrc)
    : undefined
  const normalizedWidth = normalizeDimensionAttribute(width)
  const normalizedHeight = normalizeDimensionAttribute(height)
  const imageSizes = sizes || getDefaultImageSizes(normalizedWidth)

  // 动态添加width、height和className属性，仅在它们为有效值时添加
  const imgProps = {
    ref: imageRef,
    src: currentSrc,
    srcSet,
    sizes: imageSizes,
    'data-src': src, // 存储原始图片地址
    alt: alt || 'Lazy loaded image',
    onLoad: handleThumbnailLoaded,
    onError: handleImageError,
    className: `${className || ''} lazy-image-placeholder`,
    style,
    onClick,
    // 性能优化属性
    loading: priority ? 'eager' : 'lazy',
    fetchpriority: priority ? 'high' : undefined,
    decoding: 'async',
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

/**
 * 根据窗口尺寸决定压缩图片宽度
 * @param {*} src
 * @param {*} maxWidth
 * @returns
 */
export function adjustImgSize(src, maxWidth) {
  if (!src) {
    return null
  }

  const targetWidth = getTargetImageWidth(maxWidth)
  return replaceImageWidthParam(src, targetWidth)
}

function normalizeImageWidth(width) {
  const numericWidth = Number(width)
  if (Number.isFinite(numericWidth) && numericWidth > 0) {
    return numericWidth
  }
  return 1080
}

function getTargetImageWidth(maxWidth) {
  const maxImageWidth = normalizeImageWidth(maxWidth)

  if (typeof window === 'undefined') {
    return maxImageWidth
  }

  const documentWidth =
    typeof document !== 'undefined'
      ? Number(document.documentElement?.clientWidth)
      : 0
  const viewportWidth =
    Number(window.innerWidth) ||
    documentWidth ||
    Number(window?.screen?.width) ||
    maxImageWidth

  return Math.min(Math.ceil(viewportWidth), maxImageWidth)
}

function replaceImageWidthParam(imageSrc, width) {
  if (
    !imageSrc ||
    (!imageSrc.includes('width=') && !imageSrc.includes('w='))
  ) {
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
