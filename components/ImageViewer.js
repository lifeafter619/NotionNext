import { useCallback, useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * 图片查看器组件
 * 支持放大、缩小、旋转、下载等功能
 */
const ImageViewer = ({ isOpen, src, alt, onClose }) => {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef({ x: 0, y: 0 })
  const initialDistanceRef = useRef(0)
  const initialScaleRef = useRef(1)
  const imgRef = useRef(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // 重置状态
  const resetState = useCallback(() => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
    positionRef.current = { x: 0, y: 0 }
    if (imgRef.current) {
      imgRef.current.style.transform = `translate(0px, 0px) scale(1) rotate(0deg)`
    }
  }, [])

  // 关闭时重置
  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen, resetState])

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = e => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
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
  }, [isOpen, onClose, resetState])

  // 全局滚轮事件处理 - 用于缩放图片，同时防止页面滚动
  useEffect(() => {
    if (!isOpen) return

    const handleGlobalWheel = e => {
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
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // 滚轮事件用于缩放，同时阻止页面滚动
    document.addEventListener('wheel', handleGlobalWheel, { passive: false })
    document.addEventListener('touchmove', preventTouchScroll, { passive: false })

    // 防止 body 滚动
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

  // 顺时针旋转
  const handleRotateRight = () => {
    setRotation(prev => prev + 90)
  }

  // 逆时针旋转
  const handleRotateLeft = () => {
    setRotation(prev => prev - 90)
  }

  // 下载图片 - 直接触发下载
  const handleDownload = async () => {
    if (!src) return

    try {
      // 尝试使用后端代理下载 (解决跨域和强制下载问题)
      let fileName = alt || src.split('/').pop()?.split('?')[0] || 'image.png'
      // 确保文件名有后缀
      if (!fileName.includes('.')) {
        fileName += '.png'
      }

      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(src)}&filename=${encodeURIComponent(fileName)}`
      
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
      window.open(src, '_blank')
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
      // 使用 requestAnimationFrame 实现更流畅的拖拽
      requestAnimationFrame(() => {
        const newX = e.clientX - dragStartRef.current.x
        const newY = e.clientY - dragStartRef.current.y
        positionRef.current = { x: newX, y: newY }

        // 直接操作 DOM 避免 React 重渲染导致的延迟
        if (imgRef.current) {
          imgRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scale}) rotate(${rotation}deg)`
        }
      })
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
  }, [isOpen, isDragging, scale, rotation])

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
      requestAnimationFrame(() => {
        const newX = e.touches[0].clientX - dragStartRef.current.x
        const newY = e.touches[0].clientY - dragStartRef.current.y
        positionRef.current = { x: newX, y: newY }
        if (imgRef.current) {
          imgRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scale}) rotate(${rotation}deg)`
        }
      })
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
  }, [isDragging, scale, rotation])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setPosition(positionRef.current) // 同步状态
  }, [])

  if (!isOpen || !mounted) return null

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
        onClick={e => e.stopPropagation()}
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
          src={src}
          alt={alt || 'Image'}
          className='max-w-[90vw] max-h-[80vh] object-contain'
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            ...(isDragging && { willChange: 'transform' })
          }}
          draggable={false}
        />
      </div>

      {/* 关闭按钮 */}
      <button
        className='absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors'
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

      {/* 控制栏 */}
      <div className='absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 rounded-full px-4 py-2 backdrop-blur-sm'>
        {/* 缩小 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors disabled:opacity-50'
          onClick={e => {
            e.stopPropagation()
            handleZoomOut()
          }}
          disabled={scale <= 0.25}
          aria-label='Zoom out'
          title='缩小 (-)'>
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7'
            />
          </svg>
        </button>

        {/* 缩放比例显示 */}
        <span className='text-white text-sm min-w-[60px] text-center'>
          {Math.round(scale * 100)}%
        </span>

        {/* 放大 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors disabled:opacity-50'
          onClick={e => {
            e.stopPropagation()
            handleZoomIn()
          }}
          disabled={scale >= 5}
          aria-label='Zoom in'
          title='放大 (+)'>
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7'
            />
          </svg>
        </button>

        {/* 分隔线 */}
        <div className='w-px h-6 bg-gray-500' />

        {/* 逆时针旋转 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors'
          onClick={e => {
            e.stopPropagation()
            handleRotateLeft()
          }}
          aria-label='Rotate left'
          title='逆时针旋转 (L)'>
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
            />
          </svg>
        </button>

        {/* 顺时针旋转 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors'
          onClick={e => {
            e.stopPropagation()
            handleRotateRight()
          }}
          aria-label='Rotate right'
          title='顺时针旋转 (R)'>
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6'
            />
          </svg>
        </button>

        {/* 分隔线 */}
        <div className='w-px h-6 bg-gray-500' />

        {/* 重置 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors'
          onClick={e => {
            e.stopPropagation()
            resetState()
          }}
          aria-label='Reset'
          title='重置 (0)'>
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </svg>
        </button>

        {/* 下载 */}
        <button
          className='p-2 text-white hover:text-blue-400 transition-colors'
          onClick={e => {
            e.stopPropagation()
            handleDownload()
          }}
          aria-label='Download'
          title='下载图片'>
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
            />
          </svg>
        </button>
      </div>

      {/* 快捷键提示 - Keyboard shortcuts hint */}
      <div className='absolute bottom-2 left-1/2 -translate-x-1/2 text-gray-400 text-xs'>
        ESC 关闭 | +/- 缩放 | R/L 旋转 | 0 重置 | 滚轮缩放 | 拖拽移动
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
