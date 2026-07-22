import useWindowSize from '@/hooks/useWindowSize'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { stripTransientQueryParamsFromUrl } from '@/lib/utils/stripTransientUrlParams'
import { THEMES, saveDarkModeToLocalStorage } from '@/themes/theme'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * 自定义右键菜单
 * @param {*} props
 * @returns
 */
export default function CustomContextMenu(props) {
  const [position, setPosition] = useState({ x: '0px', y: '0px' })
  const [show, setShow] = useState(false)
  const { isDarkMode, updateDarkMode, locale } = useGlobal()
  const menuRef = useRef(null)
  const previousFocusRef = useRef(null)
  const shouldRestoreFocusRef = useRef(false)
  const focusFrameRef = useRef(null)
  const windowSize = useWindowSize()
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  const allNavPages = Array.isArray(props?.allNavPages) ? props.allNavPages : []
  const router = useRouter()
  /**
   * 随机跳转文章
   */
  function handleJumpToRandomPost() {
    if (allNavPages.length === 0) return

    const randomIndex = Math.floor(Math.random() * allNavPages.length)
    const randomPost = allNavPages[randomIndex]
    if (!randomPost?.slug) return
    void router.push(`${siteConfig('SUB_PATH', '')}/${randomPost.slug}`)
  }

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const updateSize = () => {
      setWidth(menu.offsetWidth)
      setHeight(menu.offsetHeight)
    }
    updateSize()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateSize)
    observer.observe(menu)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (focusFrameRef.current !== null) {
      window.cancelAnimationFrame(focusFrameRef.current)
      focusFrameRef.current = null
    }
    shouldRestoreFocusRef.current = false
    setShow(false)
  }, [router.asPath])

  useEffect(() => {
    if (show || !previousFocusRef.current) return
    const previousFocus = previousFocusRef.current
    const shouldRestoreFocus = shouldRestoreFocusRef.current
    previousFocusRef.current = null
    shouldRestoreFocusRef.current = false
    if (
      shouldRestoreFocus &&
      previousFocus instanceof HTMLElement &&
      previousFocus.isConnected
    ) {
      previousFocus.focus()
    }
  }, [show])

  useEffect(() => {
    const handleContextMenu = event => {
      event.preventDefault()
      if (!menuRef.current?.contains(document.activeElement)) {
        previousFocusRef.current = document.activeElement
      }
      // 计算点击位置加菜单宽高是否超出屏幕，如果超出则贴边弹出
      const x = Math.max(
        0,
        event.clientX < windowSize.width - width
          ? event.clientX
          : windowSize.width - width
      )
      const y = Math.max(
        0,
        event.clientY < windowSize.height - height
          ? event.clientY
          : windowSize.height - height
      )
      setPosition({ y: `${y}px`, x: `${x}px` })
      setShow(true)
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current)
      }
      focusFrameRef.current = window.requestAnimationFrame(() => {
        menuRef.current?.querySelector('[role="menuitem"]')?.focus()
        focusFrameRef.current = null
      })
    }

    /**
     * 鼠标点击即关闭菜单
     */
    const handleClick = event => {
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current)
        focusFrameRef.current = null
      }
      shouldRestoreFocusRef.current = Boolean(
        event.target instanceof Node && menuRef.current?.contains(event.target)
      )
      setShow(false)
    }

    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('click', handleClick)
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current)
        focusFrameRef.current = null
      }
    }
  }, [height, width, windowSize.height, windowSize.width])

  function handleBack() {
    window.history.back()
  }

  function handleForward() {
    window.history.forward()
  }

  function handleRefresh() {
    window.location.reload()
  }

  function handleScrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCopyLink() {
    const url = stripTransientQueryParamsFromUrl(window.location.href)
    const copyPromise = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(url)
      : copyTextWithLegacyApi(url)

    copyPromise
      .then(() => {
        // console.log('页面地址已复制')
        alert(`${locale.COMMON.PAGE_URL_COPIED} : ${url}`)
      })
      .catch(error => {
        console.error('复制页面地址失败:', error)
      })
  }

  /**
   * 切换主题
   */
  function handleChangeTheme() {
    if (THEMES.length === 0) return
    const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)] // 从THEMES数组中 随机取一个主题
    const query = { ...router.query, theme: randomTheme }
    void router.push({ pathname: router.pathname, query })
  }

  /**
   * 复制内容
   */
  function handleCopy() {
    const selectedText = document.getSelection()?.toString() || ''
    if (!selectedText) return
    void copyTextWithLegacyApi(selectedText).catch(error => {
      console.error('复制所选文本失败:', error)
    })
  }

  function handleChangeDarkMode() {
    const newStatus = !isDarkMode
    saveDarkModeToLocalStorage(newStatus)
    updateDarkMode(newStatus)
    const htmlElement = document.getElementsByTagName('html')[0]
    htmlElement.classList?.remove(newStatus ? 'light' : 'dark')
    htmlElement.classList?.add(newStatus ? 'dark' : 'light')
  }

  // 一些配置变量
  const CUSTOM_RIGHT_CLICK_CONTEXT_MENU_RANDOM_POST = siteConfig(
    'CUSTOM_RIGHT_CLICK_CONTEXT_MENU_RANDOM_POST'
  )
  const CUSTOM_RIGHT_CLICK_CONTEXT_MENU_CATEGORY = siteConfig(
    'CUSTOM_RIGHT_CLICK_CONTEXT_MENU_CATEGORY'
  )
  const CUSTOM_RIGHT_CLICK_CONTEXT_MENU_TAG = siteConfig(
    'CUSTOM_RIGHT_CLICK_CONTEXT_MENU_TAG'
  )
  const CAN_COPY = props.canCopy ?? siteConfig('CAN_COPY')
  const CUSTOM_RIGHT_CLICK_CONTEXT_MENU_SHARE_LINK = siteConfig(
    'CUSTOM_RIGHT_CLICK_CONTEXT_MENU_SHARE_LINK'
  )
  const CUSTOM_RIGHT_CLICK_CONTEXT_MENU_DARK_MODE = siteConfig(
    'CUSTOM_RIGHT_CLICK_CONTEXT_MENU_DARK_MODE'
  )
  const CUSTOM_RIGHT_CLICK_CONTEXT_MENU_THEME_SWITCH = siteConfig(
    'CUSTOM_RIGHT_CLICK_CONTEXT_MENU_THEME_SWITCH'
  )
  return (
    <div
      ref={menuRef}
      role='menu'
      aria-hidden={!show}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault()
          shouldRestoreFocusRef.current = true
          setShow(false)
          return
        }

        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          return
        }
        const items = Array.from(
          menuRef.current?.querySelectorAll('[role="menuitem"]') || []
        )
        if (!items.length) return
        event.preventDefault()
        const currentIndex = items.indexOf(document.activeElement)
        const nextIndex =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : event.key === 'ArrowUp'
                ? currentIndex <= 0
                  ? items.length - 1
                  : currentIndex - 1
                : currentIndex < 0
                  ? 0
                  : (currentIndex + 1) % items.length
        items[nextIndex].focus()
      }}
      style={{ top: position.y, left: position.x }}
      className={`${show ? '' : 'invisible opacity-0'} select-none transition-opacity duration-200 fixed z-50`}>
      {/* 菜单内容 */}
      <div className='rounded-xl w-52 dark:hover:border-yellow-600 bg-white dark:bg-[#040404] dark:text-gray-200 dark:border-gray-600 p-3 border drop-shadow-lg flex-col duration-300 transition-colors'>
        {/* 顶部导航按钮 */}
        <div className='flex justify-between'>
          <button
            type='button'
            role='menuitem'
            aria-label='Back'
            onClick={handleBack}
            className='hover:bg-blue-600 hover:text-white h-10 w-10 flex items-center justify-center leading-none rounded cursor-pointer fa-solid fa-arrow-left'
          />
          <button
            type='button'
            role='menuitem'
            aria-label='Forward'
            onClick={handleForward}
            className='hover:bg-blue-600 hover:text-white h-10 w-10 flex items-center justify-center leading-none rounded cursor-pointer fa-solid fa-arrow-right'
          />
          <button
            type='button'
            role='menuitem'
            aria-label='Refresh'
            onClick={handleRefresh}
            className='hover:bg-blue-600 hover:text-white h-10 w-10 flex items-center justify-center leading-none rounded cursor-pointer fa-solid fa-rotate-right'
          />
          <button
            type='button'
            role='menuitem'
            aria-label='Scroll to top'
            onClick={handleScrollTop}
            className='hover:bg-blue-600 hover:text-white h-10 w-10 flex items-center justify-center leading-none rounded cursor-pointer fa-solid fa-arrow-up'
          />
        </div>

        <hr className='my-2 border-dashed' />

        {/* 跳转导航按钮 */}
        <div className='w-full px-2'>
          {CUSTOM_RIGHT_CLICK_CONTEXT_MENU_RANDOM_POST &&
            allNavPages.length > 0 && (
              <button
                type='button'
                role='menuitem'
                onClick={handleJumpToRandomPost}
                title={locale.MENU.WALK_AROUND}
                className='w-full px-2 h-10 flex justify-start items-center flex-nowrap cursor-pointer hover:bg-blue-600 hover:text-white rounded-lg duration-200 transition-all'>
                <i className='fa-solid fa-podcast mr-2' />
                <div className='whitespace-nowrap'>
                  {locale.MENU.WALK_AROUND}
                </div>
              </button>
            )}

          {CUSTOM_RIGHT_CLICK_CONTEXT_MENU_CATEGORY && (
            <SmartLink
              role='menuitem'
              href='/category'
              title={locale.MENU.CATEGORY}
              className='w-full px-2 h-10 flex justify-start items-center flex-nowrap cursor-pointer hover:bg-blue-600 hover:text-white rounded-lg duration-200 transition-all'>
              <i className='fa-solid fa-square-minus mr-2' />
              <div className='whitespace-nowrap'>{locale.MENU.CATEGORY}</div>
            </SmartLink>
          )}

          {CUSTOM_RIGHT_CLICK_CONTEXT_MENU_TAG && (
            <SmartLink
              role='menuitem'
              href='/tag'
              title={locale.MENU.TAGS}
              className='w-full px-2 h-10 flex justify-start items-center flex-nowrap cursor-pointer hover:bg-blue-600 hover:text-white rounded-lg duration-200 transition-all'>
              <i className='fa-solid fa-tag mr-2' />
              <div className='whitespace-nowrap'>{locale.MENU.TAGS}</div>
            </SmartLink>
          )}
        </div>

        <hr className='my-2 border-dashed' />

        {/* 功能按钮 */}
        <div className='w-full px-2'>
          {CAN_COPY && (
            <button
              type='button'
              role='menuitem'
              onClick={handleCopy}
              title={locale.MENU.COPY}
              className='w-full px-2 h-10 flex justify-start items-center flex-nowrap cursor-pointer hover:bg-blue-600 hover:text-white rounded-lg duration-200 transition-all'>
              <i className='fa-solid fa-copy mr-2' />
              <div className='whitespace-nowrap'>{locale.MENU.COPY}</div>
            </button>
          )}

          {CUSTOM_RIGHT_CLICK_CONTEXT_MENU_SHARE_LINK && (
            <button
              type='button'
              role='menuitem'
              onClick={handleCopyLink}
              title={locale.MENU.SHARE_URL}
              className='w-full px-2 h-10 flex justify-start items-center flex-nowrap cursor-pointer hover:bg-blue-600 hover:text-white rounded-lg duration-200 transition-all'>
              <i className='fa-solid fa-arrow-up-right-from-square mr-2' />
              <div className='whitespace-nowrap'>{locale.MENU.SHARE_URL}</div>
            </button>
          )}

          {CUSTOM_RIGHT_CLICK_CONTEXT_MENU_DARK_MODE && (
            <button
              type='button'
              role='menuitem'
              onClick={handleChangeDarkMode}
              title={
                isDarkMode ? locale.MENU.LIGHT_MODE : locale.MENU.DARK_MODE
              }
              className='w-full px-2 h-10 flex justify-start items-center flex-nowrap cursor-pointer hover:bg-blue-600 hover:text-white rounded-lg duration-200 transition-all'>
              {isDarkMode ? (
                <i className='fa-regular fa-sun mr-2' />
              ) : (
                <i className='fa-regular fa-moon mr-2' />
              )}
              <div className='whitespace-nowrap'>
                {' '}
                {isDarkMode ? locale.MENU.LIGHT_MODE : locale.MENU.DARK_MODE}
              </div>
            </button>
          )}

          {CUSTOM_RIGHT_CLICK_CONTEXT_MENU_THEME_SWITCH && (
            <button
              type='button'
              role='menuitem'
              onClick={handleChangeTheme}
              title={locale.MENU.THEME_SWITCH}
              className='w-full px-2 h-10 flex justify-start items-center flex-nowrap cursor-pointer hover:bg-blue-600 hover:text-white rounded-lg duration-200 transition-all'>
              <i className='fa-solid fa-palette mr-2' />
              <div className='whitespace-nowrap'>
                {locale.MENU.THEME_SWITCH}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function copyTextWithLegacyApi(value) {
  return new Promise((resolve, reject) => {
    const tempInput = document.createElement('textarea')
    tempInput.value = value
    tempInput.setAttribute('readonly', '')
    tempInput.style.position = 'fixed'
    tempInput.style.opacity = '0'
    document.body.appendChild(tempInput)
    tempInput.select()

    try {
      if (!document.execCommand('copy')) {
        throw new Error('Copy command was rejected')
      }
      resolve()
    } catch (error) {
      reject(error)
    } finally {
      tempInput.remove()
    }
  })
}
