import { siteConfig } from '@/lib/config'
import Head from 'next/head'
import { useRef, useState, useEffect } from 'react'

/**
 * 图片懒加载
 * 使用原生 loading="lazy" 和 srcset 优化加载性能
 * @param {*} param0
 * @returns
 */
export default function LazyImage({
  priority,
  id,
  src,
  alt,
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
  const [isLoaded, setIsLoaded] = useState(false)
  const imageRef = useRef(null)

  const handleImageLoaded = (e) => {
    setIsLoaded(true)
    if (typeof onLoad === 'function') {
      onLoad(e)
    }
  }

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      handleImageLoaded()
    }
  }, [])

  const handleImageError = (e) => {
    if (e.target.src !== placeholderSrc && placeholderSrc) {
      e.target.src = placeholderSrc
    } else {
      e.target.src = defaultPlaceholderSrc
    }
    if (typeof onError === 'function') {
      onError(e)
    }
  }

  // 构造 srcset 以支持响应式图片加载
  const generateSrcSet = (imageSrc) => {
    if (!imageSrc || (!imageSrc.includes('width=') && !imageSrc.includes('w='))) {
      return undefined
    }

    // 定义常用的图片宽度断点
    const breakpoints = [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]

    return breakpoints
      .filter(w => w <= maxWidth) // 限制最大宽度
      .map(w => {
        // 替换 url 中的 width 参数
        const newSrc = imageSrc
          .replace(/width=\d+/, `width=${w}`)
          .replace(/w=\d+/, `w=${w}`)
        return `${newSrc} ${w}w`
      })
      .join(', ')
  }

  // 基础 src，使用最大宽度
  const baseSrc = adjustImgSize(src, maxWidth)
  const srcSet = generateSrcSet(src)

  // 动态添加width、height和className属性
  const imgProps = {
    ref: imageRef,
    src: baseSrc || defaultPlaceholderSrc,
    srcSet: srcSet,
    sizes: sizes || '100vw', // 默认让浏览器根据 viewport 决定大小
    ...(src && { 'data-src': src }),
    alt: alt || 'Lazy loaded image',
    onLoad: handleImageLoaded,
    onError: handleImageError,
    // 只有当未加载完成时才添加 placeholder 类 (用于 CSS 模糊等效果)
    className: `${className || ''} ${!isLoaded ? 'lazy-image-placeholder' : ''}`,
    style,
    width: width || 'auto',
    height: height || 'auto',
    onClick,
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async',
    ...(siteConfig('WEBP_SUPPORT') && { 'data-webp': true }),
    ...(siteConfig('AVIF_SUPPORT') && { 'data-avif': true })
  }

  if (id) imgProps.id = id
  if (title) imgProps.title = title

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...imgProps} />
      {/* 预加载优先级高的图片 */}
      {priority && (
        <Head>
          <link rel='preload' as='image' href={baseSrc} imagesrcset={srcSet} imagesizes={imgProps.sizes} />
        </Head>
      )}
    </>
  )
}

/**
 * 根据配置的最大宽度调整图片 URL
 * 这里主要用于生成默认的 src
 */
const adjustImgSize = (src, maxWidth) => {
  if (!src) {
    return null
  }

  // 如果没有 width 参数，直接返回原图
  if (!src.includes('width=') && !src.includes('w=')) {
    return src
  }

  // 替换 width/w 参数为配置的 maxWidth
  return src
    .replace(/width=\d+/, `width=${maxWidth}`)
    .replace(/w=\d+/, `w=${maxWidth}`)
}
