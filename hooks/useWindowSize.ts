import { useEffect, useState } from 'react'

interface WindowSize {
  width: number
  height: number
}

const defaultSize: WindowSize = {
  width: 0,
  height: 0
}

const getCurrentWindowSize = (): WindowSize => {
  if (typeof document === 'undefined') {
    return defaultSize
  }

  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight
  }
}

const useWindowSize = () => {
  const [size, setSize] = useState<WindowSize>(defaultSize)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const onResize = () => {
      setSize(getCurrentWindowSize())
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])
  return size
}

export default useWindowSize
