import { useRouter } from 'next/router'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

/**
 * 侧边栏抽屉面板，可以从侧面拉出
 * @returns {JSX.Element}
 * @constructor
 */
const SideBarDrawer = ({
  children,
  isOpen,
  onOpen,
  onClose,
  className,
  showOnPC = false,
  ariaLabel = '侧边栏'
}) => {
  const router = useRouter()
  const drawerRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const instanceId = useId().replace(/:/g, '')
  const drawerId = `sidebar-drawer-${instanceId}`
  const closeDrawer = useCallback(() => {
    onCloseRef.current?.()
  }, [])

  const switchSideDrawerVisible = showStatus => {
    if (showStatus) {
      onOpen?.()
    } else {
      closeDrawer()
    }
  }

  /**
   * 移动端：打开抽屉后同一手势会触发「幽灵点击」落在全屏遮罩上导致立刻关闭。
   * 打开后短时间内遮罩 pointer-events: none，超时后再响应关闭。
   */
  const [backdropInteractive, setBackdropInteractive] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setBackdropInteractive(false)
      return
    }
    setBackdropInteractive(false)
    const id = window.setTimeout(() => setBackdropInteractive(true), 180)
    return () => window.clearTimeout(id)
  }, [isOpen])

  useEffect(() => {
    const sideBarDrawerRouteListener = () => {
      closeDrawer()
    }
    router.events.on('routeChangeComplete', sideBarDrawerRouteListener)
    return () => {
      router.events.off('routeChangeComplete', sideBarDrawerRouteListener)
    }
  }, [closeDrawer, router.events])

  useEffect(() => {
    const drawer = drawerRef.current
    if (!isOpen || !drawer) return

    const originalOverflow = document.body.style.overflow
    previousFocusRef.current = document.activeElement
    document.body.style.overflow = 'hidden'

    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusable = drawer.querySelector(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      ;(firstFocusable || drawer).focus()
    })

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(
        drawer.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (!focusable.length) {
        event.preventDefault()
        drawer.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
      const previousFocus = previousFocusRef.current
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus()
      }
    }
  }, [closeDrawer, isOpen])

  return (
    <div
      id={`sidebar-wrapper-${instanceId}`}
      className={`block ${showOnPC ? '' : 'lg:hidden'} top-0`}>
      <div
        ref={drawerRef}
        id={drawerId}
        role='dialog'
        aria-label={ariaLabel}
        aria-modal={isOpen ? 'true' : undefined}
        aria-hidden={!isOpen}
        inert={isOpen ? undefined : ''}
        tabIndex={-1}
        className={`z-50 ${className || ''} ${isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[-100%] opacity-0'} transform transition-transform duration-300 ease-in-out bg-white dark:bg-gray-900 flex flex-col fixed h-full left-0 overflow-y-scroll top-0`}>
        {children}
      </div>

      {/* 背景蒙版 */}
      <div
        id={`sidebar-drawer-background-${instanceId}`}
        role='presentation'
        onClick={() => {
          if (!backdropInteractive) return
          switchSideDrawerVisible(false)
        }}
        className={`fixed top-0 left-0 z-[60] h-full w-full bg-black/70 transition-opacity duration-200 ease-out ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${isOpen && !backdropInteractive ? 'pointer-events-none' : ''}`}
      />
    </div>
  )
}

export default SideBarDrawer
