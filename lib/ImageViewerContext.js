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
  const [images, setImages] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  /**
   * @param {Array} imageList 图片列表 [{src, alt, highResSrc}]
   * @param {number} index 当前图片索引
   */
  const openViewer = useCallback((imageList, index = 0) => {
    if (imageList && imageList.length > 0) {
      setImages(imageList)
      setCurrentIndex(index)
      setIsOpen(true)
    } else if (typeof imageList === 'string') {
        // 兼容旧的调用方式 openViewer(src, alt, highResSrc)
        // 但这里我们只在 ImageViewer.js 处理了新逻辑，所以最好是在 NotionPage 中统一调用方式
        // 不过为了安全，这里做一个适配
        const src = imageList
        const alt = index // 实际上是第二个参数
        const highResSrc = arguments[2] || ''
        setImages([{ src, alt, highResSrc }])
        setCurrentIndex(0)
        setIsOpen(true)
    }
  }, [])

  const closeViewer = useCallback(() => {
    setIsOpen(false)
    setImages([])
    setCurrentIndex(0)
  }, [])

  return (
    <ImageViewerContext.Provider value={{ openViewer, closeViewer, isOpen }}>
      {children}
      <ImageViewer
        isOpen={isOpen}
        images={images}
        currentIndex={currentIndex}
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
