import { useEffect, useImperativeHandle, useRef } from 'react'

/**
 * 折叠面板组件，支持水平折叠、垂直折叠
 * @param {type:['horizontal','vertical'], isOpen} props
 * @returns
 */
const Collapse = ({
  type = 'vertical',
  isOpen = false,
  children,
  onHeightChange,
  className,
  collapseRef
}) => {
  const ref = useRef(null)
  const onHeightChangeRef = useRef(onHeightChange)
  onHeightChangeRef.current = onHeightChange

  useImperativeHandle(collapseRef, () => {
    return {
      /**
       * 当子元素高度变化时，可调用此方法更新折叠组件的高度
       * @param {*} param0
       */
      updateCollapseHeight: ({ height, increase }) => {
        if (isOpen && ref.current) {
          const sizeProperty = type === 'horizontal' ? 'width' : 'height'
          ref.current.style[sizeProperty] = 'auto'
        }
      }
    }
  }, [isOpen, type])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const sizeProperty = type === 'horizontal' ? 'width' : 'height'
    const measuredSize =
      type === 'horizontal' ? element.scrollWidth : element.scrollHeight
    let outerFrame = null
    let innerFrame = null
    let transitionTimer = null

    if (isOpen) {
      element.style[sizeProperty] = `${measuredSize}px`
      transitionTimer = window.setTimeout(() => {
        if (ref.current === element) {
          element.style[sizeProperty] = 'auto'
        }
      }, 400)
    } else {
      outerFrame = window.requestAnimationFrame(() => {
        element.style[sizeProperty] = `${measuredSize}px`
        innerFrame = window.requestAnimationFrame(() => {
          element.style[sizeProperty] = '0px'
        })
      })
    }

    // 通知父组件高度变化
    onHeightChangeRef.current?.({
      height: element.scrollHeight,
      increase: isOpen
    })

    return () => {
      if (transitionTimer) window.clearTimeout(transitionTimer)
      if (outerFrame) window.cancelAnimationFrame(outerFrame)
      if (innerFrame) window.cancelAnimationFrame(innerFrame)
    }
  }, [isOpen, type])

  return (
    <div
      ref={ref}
      style={
        type === 'vertical'
          ? { height: '0px', willChange: 'height' }
          : { width: '0px', willChange: 'width' }
      }
      className={`${className || ''} overflow-hidden duration-300`}>
      {children}
    </div>
  )
}

export default Collapse
