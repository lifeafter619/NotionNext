import { createContext, useCallback, useContext, useState } from 'react'
import ImageViewer from '@/components/ImageViewer'

/**
 * 图片查看器上下文
 * 用于在全局范围内控制图片查看器
 */
const ImageViewerContext = createContext(null)

/**
 * 图片查看器提供者组件
 */
export const ImageViewerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState('')
  const [imageHighResSrc, setImageHighResSrc] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  /**
   * @param {string} src 图片地址
   * @param {string} alt 图片描述
   * @param {string} highResSrc 高清图片地址
   */
  const openViewer = useCallback((src, alt = '', highResSrc = '') => {
    // 确保src是有效的图片URL
    if (src) {
      setImageSrc(src)
      setImageHighResSrc(highResSrc)
      setImageAlt(alt)
      setIsOpen(true)
    }
  }, [])

  const closeViewer = useCallback(() => {
    setIsOpen(false)
    setImageSrc('')
    setImageHighResSrc('')
    setImageAlt('')
  }, [])

  return (
    <ImageViewerContext.Provider value={{ openViewer, closeViewer, isOpen }}>
      {children}
      <ImageViewer
        isOpen={isOpen}
        src={imageSrc}
        highResSrc={imageHighResSrc}
        alt={imageAlt}
        onClose={closeViewer}
      />
    </ImageViewerContext.Provider>
  )
}

/**
 * 使用图片查看器的Hook
 */
export const useImageViewerContext = () => {
  const context = useContext(ImageViewerContext)
  if (!context) {
    throw new Error(
      'useImageViewerContext must be used within an ImageViewerProvider'
    )
  }
  return context
}

export default ImageViewerContext
