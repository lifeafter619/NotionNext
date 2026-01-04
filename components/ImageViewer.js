import { useCallback, useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * 图片查看器组件
 * 支持放大、缩小、旋转、翻转、下载、切换图片、缩略图预览等功能
 */
const ImageViewer = ({ isOpen, images, currentIndex, onClose }) => {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 翻转状态
  const [flipX, setFlipX] = useState(false)
  const [flipY, setFlipY] = useState(false)

  // 缩略图栏显示状态
  const [showThumbnails, setShowThumbnails] = useState(false)

  // 缩放输入值 (用于 input 显示)
  const [zoomInput, setZoomInput] = useState('100')

  // 当前图片索引
  const [index, setIndex] = useState(currentIndex)

  // 图片显示状态
  const currentImage = images && images.length > 0 ? images[index] : null
  const src = currentImage?.src || ''
  const highResSrc = currentImage?.highResSrc || ''
  const alt = currentImage?.alt || ''

  const [displaySrc, setDisplaySrc] = useState(src) // 当前显示的图片URL
  const [isHighResLoaded, setIsHighResLoaded] = useState(false)

  const dragStartRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef({ x: 0, y: 0 })
  const initialDistanceRef = useRef(0)
  const initialScaleRef = useRef(1)
  const imgRef = useRef(null)
  const thumbnailScrollRef = useRef(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // 当外部传入的 currentIndex 改变时更新内部 index
  useEffect(() => {
    if (isOpen) {
      setIndex(currentIndex)
    }
  }, [isOpen, currentIndex])

  // 初始化图片：优先显示缩略图，后台加载高清图
  useEffect(() => {
    if (isOpen && src) {
      // 重置状态
      setDisplaySrc(src)
      setIsHighResLoaded(false)
      // 重置变换状态
      resetState()

      // 如果有高清图，尝试加载
      if (highResSrc && highResSrc !== src) {
        const img = new Image()
        img.src = highResSrc
        img.onload = () => {
          // 只有当查看器仍然打开且src匹配时才更新
          if (isOpen) {
            setDisplaySrc(highResSrc)
            setIsHighResLoaded(true)
          }
        }
      }
    }
  }, [isOpen, src, highResSrc, index]) // index 变化时也重新加载

  // 自动滚动缩略图到当前选中项
  useEffect(() => {
    if (showThumbnails && thumbnailScrollRef.current) {
      const activeThumb = thumbnailScrollRef.current.children[index]
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [showThumbnails, index])

  // 更新缩放输入框的值
  useEffect(() => {
    setZoomInput(Math.round(scale * 100).toString())
  }, [scale])

  // 重置状态
  const resetState = useCallback(() => {
    setScale(1)
    setRotation(0)
    setFlipX(false)
    setFlipY(false)
    setPosition({ x: 0, y: 0 })
    positionRef.current = { x: 0, y: 0 }
    if (imgRef.current) {
      // transform 将在 render 中应用
    }
  }, [])

  // 切换上一张
  const handlePrev = useCallback((e) => {
    e?.stopPropagation()
    setIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images.length])

  // 切换下一张
  const handleNext = useCallback((e) => {
    e?.stopPropagation()
    setIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images.length])

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = e => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          handlePrev()
          break
        case 'ArrowRight':
          handleNext()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case 'r':
        case 'R':
          handleRotateRight()
          break
        case 'l':
        case 'L':
          handleRotateLeft()
          break
        case '0':
          resetState()
          break
        default:
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, resetState, handlePrev, handleNext])

  // 全局滚轮事件处理 - 用于缩放图片，同时防止页面滚动
  useEffect(() => {
    if (!isOpen) return

    const handleGlobalWheel = e => {
      // 如果是在缩略图栏上滚动，允许默认行为
      if (e.target.closest('.thumbnail-strip')) return

      e.preventDefault()
      e.stopPropagation()
      // 使用滚轮进行缩放
      if (e.deltaY < 0) {
        setScale(prev => Math.min(prev + 0.15, 5))
      } else {
        setScale(prev => Math.max(prev - 0.15, 0.25))
      }
      return false
    }

    const preventTouchScroll = e => {
      // 如果是在缩略图栏上滑动，允许默认行为
      if (e.target.closest('.thumbnail-strip')) return

      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // 滚轮事件用于缩放，同时阻止页面滚动
    document.addEventListener('wheel', handleGlobalWheel, { passive: false })
    document.addEventListener('touchmove', preventTouchScroll, { passive: false })

    // 防止 body 滚动并处理滚动条消失引起的布局偏移
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    const originalPaddingRight = document.body.style.paddingRight

    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }

    const originalOverflow = document.body.style.overflow
    const originalPosition = document.body.style.position
    const originalTop = document.body.style.top
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.removeEventListener('wheel', handleGlobalWheel)
      document.removeEventListener('touchmove', preventTouchScroll)
      document.body.style.overflow = originalOverflow
      document.body.style.position = originalPosition
      document.body.style.top = originalTop
      document.body.style.width = ''
      document.body.style.paddingRight = originalPaddingRight
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  // 放大
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 5))
  }

  // 缩小
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.25))
  }

  // 手动输入缩放比例
  const handleZoomChange = (e) => {
    setZoomInput(e.target.value)
  }

  const handleZoomSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      let val = parseFloat(zoomInput)
      if (isNaN(val)) val = 100
      val = Math.max(25, Math.min(500, val)) // Limit between 25% and 500%
      setScale(val / 100)
      setZoomInput(val.toString())
    }
  }

  // 顺时针旋转
  const handleRotateRight = () => {
    setRotation(prev => prev + 90)
  }

  // 逆时针旋转
  const handleRotateLeft = () => {
    setRotation(prev => prev - 90)
  }

  // 水平翻转
  const handleFlipX = () => {
    setFlipX(prev => !prev)
  }

  // 垂直翻转
  const handleFlipY = () => {
    setFlipY(prev => !prev)
  }

  // 下载图片 - 直接触发下载
  const handleDownload = async () => {
    const currentSrc = displaySrc || src
    if (!currentSrc) return

    try {
      // 尝试使用后端代理下载 (解决跨域和强制下载问题)
      let fileName = alt || currentSrc.split('/').pop()?.split('?')[0] || 'image.png'
      // 确保文件名有后缀
      if (!fileName.includes('.')) {
        fileName += '.png'
      }

      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(currentSrc)}&filename=${encodeURIComponent(fileName)}`
      
      // 创建隐藏的 link 来触发下载
      const link = document.createElement('a')
      link.href = proxyUrl
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      
      setTimeout(() => {
        document.body.removeChild(link)
      }, 1000)
    } catch (error) {
      console.error('Download failed:', error)
      // 降级：直接打开链接
      window.open(currentSrc, '_blank')
    }
  }

  // 鼠标拖拽开始
  const handleMouseDown = e => {
    if (e.button !== 0) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y
    }
  }

  // 全局鼠标移动和释放事件 - 确保拖拽在窗口外也能继续
  useEffect(() => {
    if (!isOpen) return

    const handleGlobalMouseMove = e => {
      if (!isDragging) return
      e.preventDefault()
      // 直接更新位置，不使用 requestAnimationFrame，实现跟手效果
      const newX = e.clientX - dragStartRef.current.x
      const newY = e.clientY - dragStartRef.current.y
      positionRef.current = { x: newX, y: newY }

      // 直接操作 DOM 避免 React 重渲染导致的延迟
      // 注意：这里我们手动应用所有变换
      if (imgRef.current) {
        const transform = `translate(${newX}px, ${newY}px) scale(${scale}) rotate(${rotation}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`
        imgRef.current.style.transform = transform
      }
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setPosition(positionRef.current) // 拖拽结束时同步状态
    }

    // 添加全局事件监听器到 document，确保拖拽在窗口外也能工作
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isOpen, isDragging, scale, rotation, flipX, flipY])

  // 触摸事件支持
  const handleTouchStart = e => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      dragStartRef.current = {
        x: e.touches[0].clientX - positionRef.current.x,
        y: e.touches[0].clientY - positionRef.current.y
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false)
      // 缩放开始前同步位置状态，防止缩放时位置跳变
      setPosition(positionRef.current)

      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
      initialDistanceRef.current = distance
      initialScaleRef.current = scale
    }
  }

  const handleTouchMove = useCallback(e => {
    e.preventDefault()
    if (e.touches.length === 1 && isDragging) {
      // 直接更新位置，不使用 requestAnimationFrame，实现跟手效果
      const newX = e.touches[0].clientX - dragStartRef.current.x
      const newY = e.touches[0].clientY - dragStartRef.current.y
      positionRef.current = { x: newX, y: newY }
      if (imgRef.current) {
        const transform = `translate(${newX}px, ${newY}px) scale(${scale}) rotate(${rotation}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`
        imgRef.current.style.transform = transform
      }
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
      if (initialDistanceRef.current > 0) {
        const newScale = initialScaleRef.current * (distance / initialDistanceRef.current)
        const clampedScale = Math.min(Math.max(newScale, 0.25), 5)
        setScale(clampedScale)
      }
    }
  }, [isDragging, scale, rotation, flipX, flipY])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setPosition(positionRef.current) // 同步状态
  }, [])

  if (!isOpen || !mounted) return null

  // 计算当前的 transform 字符串，用于初始渲染和非拖拽状态
  const transformStyle = `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg) scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`

  const content = (
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/90'
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-label='Image viewer'>
      {/* 背景遮罩 */}
      <div className='absolute inset-0 backdrop-blur-sm' />

      {/* 图片容器 */}
      <div
        className='relative max-w-full max-h-full select-none'
        onClick={e => e.stopPropagation()} // 防止点击图片关闭
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none' // 明确禁止浏览器处理触摸手势
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={displaySrc}
          alt={alt || 'Image'}
          className={`max-w-[90vw] max-h-[80vh] object-contain transition-opacity duration-300 ${isHighResLoaded ? 'opacity-100' : 'opacity-90 blur-[1px]'}`}
          style={{
            transform: transformStyle,
            ...(isDragging && { willChange: 'transform' }) // 拖拽时优化性能
          }}
          draggable={false}
          loading='eager'
          decoding='sync'
        />
      </div>

      {/* 关闭按钮 */}
      <button
        className='absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors z-50 rounded-full bg-black/20 hover:bg-black/40'
        onClick={onClose}
        aria-label='Close image viewer'>
        <svg
          className='w-8 h-8'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M6 18L18 6M6 6l12 12'
          />
        </svg>
      </button>

      {/* 切换按钮 - 仅当有多张图片时显示 */}
      {images && images.length > 1 && (
        <>
          <button
            className='absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors z-50'
            onClick={handlePrev}
            aria-label='Previous image'>
            <svg className='w-8 h-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
          </button>
          <button
            className='absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors z-50'
            onClick={handleNext}
            aria-label='Next image'>
            <svg className='w-8 h-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
            </svg>
          </button>
        </>
      )}

      {/* 缩略图栏 */}
      {showThumbnails && images && images.length > 0 && (
        <div
            className='thumbnail-strip absolute bottom-20 left-0 right-0 h-20 bg-black/80 flex items-center gap-2 overflow-x-auto px-4 py-2 z-50 backdrop-blur-md transition-all duration-300'
            onClick={e => e.stopPropagation()} // 防止点击缩略图栏关闭
        >
            <div ref={thumbnailScrollRef} className='flex gap-2 mx-auto'>
                {images.map((img, i) => (
                    <div
                        key={i}
                        className={`relative w-16 h-16 flex-shrink-0 cursor-pointer rounded overflow-hidden border-2 transition-colors ${i === index ? 'border-blue-500' : 'border-transparent hover:border-gray-500'}`}
                        onClick={() => setIndex(i)}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={img.src}
                            alt={`Thumbnail ${i + 1}`}
                            className='w-full h-full object-cover'
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* 控制栏 */}
      <div
        className='absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 rounded-full px-4 py-2 backdrop-blur-sm z-50'
        onClick={e => e.stopPropagation()} // 防止点击控制栏关闭
      >
        {/* 图片索引指示器 */}
        {images && images.length > 0 && (
            <>
            <div className="flex items-center gap-2">
                <span className='text-white text-sm font-medium'>
                    {index + 1} / {images.length}
                </span>
                <button
                    className={`text-white p-1 hover:text-blue-400 transition-colors rounded ${showThumbnails ? 'text-blue-400' : ''}`}
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    title='缩略图'
                >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' />
                    </svg>
                </button>
            </div>
            <div className='w-px h-6 bg-gray-500' />
            </>
        )}

        {/* 缩小 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors disabled:opacity-50'
          onClick={handleZoomOut}
          disabled={scale <= 0.25}
          aria-label='Zoom out'
          title='缩小 (-)'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 12H4' />
          </svg>
        </button>

        {/* 缩放比例显示 (可输入) */}
        <div className="relative group flex items-center justify-center">
            <input
                type="text"
                value={zoomInput}
                onChange={handleZoomChange}
                onKeyDown={handleZoomSubmit}
                onBlur={handleZoomSubmit}
                className="w-12 bg-transparent text-white text-sm text-center border-b border-transparent hover:border-gray-400 focus:border-blue-400 outline-none transition-colors"
            />
            <span className="text-white text-xs absolute right-[-8px] pointer-events-none">%</span>
        </div>

        {/* 放大 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors disabled:opacity-50'
          onClick={handleZoomIn}
          disabled={scale >= 5}
          aria-label='Zoom in'
          title='放大 (+)'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
        </button>

        {/* 分隔线 */}
        <div className='w-px h-6 bg-gray-500' />

        {/* 逆时针旋转 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors'
          onClick={handleRotateLeft}
          aria-label='Rotate left'
          title='逆时针旋转 (L)'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' />
          </svg>
        </button>

        {/* 顺时针旋转 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors'
          onClick={handleRotateRight}
          aria-label='Rotate right'
          title='顺时针旋转 (R)'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6' />
          </svg>
        </button>

        {/* 水平翻转 (图标替换为更明显的箭头) */}
        <button
          className={`p-2 hover:text-blue-400 transition-colors ${flipX ? 'text-blue-400' : 'text-white'}`}
          onClick={handleFlipX}
          aria-label='Flip Horizontal'
          title='水平翻转'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' className="hidden" />
            {/* 新图标: 双向水平箭头 */}
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' />
          </svg>
        </button>

        {/* 垂直翻转 (图标替换为更明显的箭头) */}
        <button
          className={`p-2 hover:text-blue-400 transition-colors ${flipY ? 'text-blue-400' : 'text-white'}`}
          onClick={handleFlipY}
          aria-label='Flip Vertical'
          title='垂直翻转'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
             {/* 新图标: 双向垂直箭头 */}
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' />
          </svg>
        </button>

        {/* 分隔线 */}
        <div className='w-px h-6 bg-gray-500' />

        {/* 重置 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors'
          onClick={resetState}
          aria-label='Reset'
          title='重置 (0)'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
          </svg>
        </button>

        {/* 下载 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors'
          onClick={handleDownload}
          aria-label='Download'
          title='下载图片'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' />
          </svg>
        </button>
      </div>

      {/* 快捷键提示 - Keyboard shortcuts hint */}
      <div
        className='absolute bottom-2 left-1/2 -translate-x-1/2 text-gray-400 text-xs z-50 select-none'
        onClick={e => e.stopPropagation()}
      >
        ESC 关闭 | ← → 切换 | +/- 缩放 | R/L 旋转 | 0 重置 | 滚轮缩放 | 拖拽移动
      </div>
    </div>
  )

  // 使用portal渲染到body
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return null
}

export default ImageViewer
