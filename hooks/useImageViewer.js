import { useCallback, useState } from 'react'

/**
 * 图片查看器Hook
 * 用于管理图片查看器的状态
 */
export const useImageViewer = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  const openViewer = useCallback((src, alt = '') => {
    setImageSrc(src)
    setImageAlt(alt)
    setIsOpen(true)
  }, [])

  const closeViewer = useCallback(() => {
    setIsOpen(false)
    setImageSrc('')
    setImageAlt('')
  }, [])

  return {
    isOpen,
    imageSrc,
    imageAlt,
    openViewer,
    closeViewer
  }
}

export default useImageViewer
