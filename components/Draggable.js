import { useEffect, useRef, useState } from 'react'

/**
 * 可拖拽组件
 * @param {children} 渲染的子元素
 * @param {stick} 是否要吸附
 * @returns
 */
export const Draggable = ({ children, stick, handleClassName }) => {
  const draggableRef = useRef(null)
  const rafRef = useRef(null)
  const currentObjRef = useRef(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    const dragRoot = draggableRef.current
    const dragTarget = dragRoot?.firstElementChild
    if (!dragRoot || !dragTarget) return

    let activePointerId = null
    let offsetX = 0
    let offsetY = 0

    const checkInWindow = () => {
      const rect = dragTarget.getBoundingClientRect()
      const maxLeft = Math.max(window.innerWidth - rect.width, 0)
      const maxTop = Math.max(window.innerHeight - rect.height, 0)
      const nextLeft =
        stick === 'left'
          ? 0
          : stick === 'right'
            ? maxLeft
            : Math.min(Math.max(rect.left, 0), maxLeft)
      const nextTop = Math.min(Math.max(rect.top, 0), maxTop)

      dragTarget.style.left = `${nextLeft}px`
      dragTarget.style.top = `${nextTop}px`
    }

    const stop = event => {
      if (activePointerId === null || event.pointerId !== activePointerId)
        return
      activePointerId = null
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      setMoving(false)
      dragRoot.releasePointerCapture?.(event.pointerId)
      if (stick) checkInWindow()
    }

    const move = event => {
      if (activePointerId === null || event.pointerId !== activePointerId)
        return
      event.preventDefault()
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = window.requestAnimationFrame(() => {
        dragTarget.style.left = `${event.clientX - offsetX}px`
        dragTarget.style.top = `${event.clientY - offsetY}px`
      })
    }

    const start = event => {
      if (
        event.button !== 0 ||
        (event.target instanceof Element &&
          event.target.closest(
            'button, a, input, textarea, select, [role="button"]'
          ))
      ) {
        return
      }

      const rect = dragTarget.getBoundingClientRect()
      activePointerId = event.pointerId
      offsetX = event.clientX - rect.left
      offsetY = event.clientY - rect.top
      dragRoot.setPointerCapture?.(event.pointerId)
      setMoving(true)
    }

    dragRoot.addEventListener('pointerdown', start)
    dragRoot.addEventListener('pointermove', move)
    dragRoot.addEventListener('pointerup', stop)
    dragRoot.addEventListener('pointercancel', stop)
    window.addEventListener('resize', checkInWindow)

    return () => {
      dragRoot.removeEventListener('pointerdown', start)
      dragRoot.removeEventListener('pointermove', move)
      dragRoot.removeEventListener('pointerup', stop)
      dragRoot.removeEventListener('pointercancel', stop)
      window.removeEventListener('resize', checkInWindow)
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [stick, handleClassName])

  return (
    <div
      className={`draggable ${moving ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
      style={{ touchAction: 'none' }}
      ref={draggableRef}>
      {children}
    </div>
  )
}
