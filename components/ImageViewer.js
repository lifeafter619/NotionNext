import { useCallback, useEffect, useState } from 'react'
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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // 重置状态
  const resetState = useCallback(() => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
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

  // 下载图片
  const handleDownload = async () => {
    if (!src) return

    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = alt || 'image'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      // If fetch fails, open image link directly
      console.warn('Failed to download image:', error?.message || 'Unknown error')
      window.open(src, '_blank')
    }
  }

  // 鼠标拖拽
  const handleMouseDown = e => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = e => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 鼠标滚轮缩放
  const handleWheel = e => {
    e.preventDefault()
    if (e.deltaY < 0) {
      handleZoomIn()
    } else {
      handleZoomOut()
    }
  }

  // 触摸事件支持
  const handleTouchStart = e => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      })
    }
  }

  const handleTouchMove = e => {
    if (!isDragging || e.touches.length !== 1) return
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  if (!isOpen || !mounted) return null

  const content = (
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/90'
      onClick={onClose}
      onWheel={handleWheel}
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
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || 'Image'}
          className='max-w-[90vw] max-h-[80vh] object-contain transition-transform duration-200'
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`
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
        ESC Close | +/- Zoom | R/L Rotate | 0 Reset | Scroll to Zoom | Drag to Move
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
