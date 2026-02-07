import BLOG, { LAYOUT_MAPPINGS } from '@/blog.config'
import * as ThemeComponents from '@theme-components'
import getConfig from 'next/config'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { getQueryParam, getQueryVariable, isBrowser } from '../lib/utils'

// 缓存已解析的主题配置，避免重复动态导入
const themeConfigCache = new Map()

// 在next.config.js中扫描所有主题
export const { THEMES = [] } = getConfig()?.publicRuntimeConfig || {}

/**
 * 获取主题配置
 * @param {string} themeQuery - 主题查询参数（支持多个主题用逗号分隔）
 * @returns {Promise<object>} 主题配置对象
 */
export const getThemeConfig = async themeQuery => {
  const themeName =
    typeof themeQuery === 'string' && themeQuery.trim()
      ? themeQuery.split(',')[0].trim()
      : BLOG.THEME
  const cacheKey = themeName || BLOG.THEME

  if (themeConfigCache.has(cacheKey)) {
    return themeConfigCache.get(cacheKey)
  }

  const loadPromise = (async () => {
    if (cacheKey !== BLOG.THEME) {
      try {
        const THEME_CONFIG = await import(`@/themes/${cacheKey}`)
          .then(m => m.THEME_CONFIG)
          .catch(err => {
            console.error(`Failed to load theme ${cacheKey}:`, err)
            return null
          })

        if (THEME_CONFIG) {
          return THEME_CONFIG
        }

        console.warn(
          `Loading ${cacheKey} failed. Falling back to default theme.`
        )
        return ThemeComponents?.THEME_CONFIG
      } catch (error) {
        console.error(
          `Error loading theme configuration for ${cacheKey}:`,
          error
        )
        return ThemeComponents?.THEME_CONFIG
      }
    }

    return ThemeComponents?.THEME_CONFIG
  })()

  themeConfigCache.set(cacheKey, loadPromise)
  return loadPromise
}

/**
 * 加载全局布局
 * @param {*} theme
 * @returns
 */
export const getBaseLayoutByTheme = theme => {
  const LayoutBase = ThemeComponents['LayoutBase']
  const isDefaultTheme = !theme || theme === BLOG.THEME
  if (!isDefaultTheme) {
    return dynamic(
      () => import(`@/themes/${theme}`).then(m => m['LayoutBase']),
      { ssr: true }
    )
  }

  return LayoutBase
}

/**
 * 动态获取布局
 * @param {*} props
 */
export const DynamicLayout = props => {
  const { theme, layoutName } = props
  const SelectedLayout = useLayoutByTheme({ layoutName, theme })
  return <SelectedLayout {...props} />
}

/**
 * 加载主题文件
 * @param {*} layoutName
 * @param {*} theme
 * @returns
 */
export const useLayoutByTheme = ({ layoutName, theme }) => {
  // const layoutName = getLayoutNameByPath(router.pathname, router.asPath)
  const LayoutComponents =
    ThemeComponents[layoutName] || ThemeComponents.LayoutSlug

  const router = useRouter()
  const themeQuery = getQueryParam(router?.asPath, 'theme') || theme
  const isDefaultTheme = !themeQuery || themeQuery === BLOG.THEME

  // 加载非当前默认主题
  if (!isDefaultTheme) {
    const loadThemeComponents = componentsSource => {
      const components =
        componentsSource[layoutName] || componentsSource.LayoutSlug
      setTimeout(fixThemeDOM, 500)
      return components
    }
    return dynamic(
      () => import(`@/themes/${themeQuery}`).then(m => loadThemeComponents(m)),
      { ssr: true }
    )
  }

  setTimeout(fixThemeDOM, 100)
  return LayoutComponents
}

/**
 * 根据路径 获取对应的layout名称
 * @param {*} path
 * @returns
 */
const getLayoutNameByPath = path => {
  const layoutName = LAYOUT_MAPPINGS[path] || 'LayoutSlug'
  //   console.log('path-layout',path,layoutName)
  return layoutName
}

/**
 * 切换主题时的特殊处理
 * 删除多余的元素
 */
const fixThemeDOM = () => {
  if (isBrowser) {
    const elements = document.querySelectorAll('[id^="theme-"]')
    if (elements?.length > 1) {
      for (let i = 0; i < elements.length - 1; i++) {
        if (
          elements[i] &&
          elements[i].parentNode &&
          elements[i].parentNode.contains(elements[i])
        ) {
          elements[i].parentNode.removeChild(elements[i])
        }
      }
      elements[0]?.scrollIntoView()
    }
  }
}

/**
 * 初始化主题 , 优先级 query > cookies > systemPrefer
 * @param isDarkMode
 * @param updateDarkMode 更改主题ChangeState函数
 * @description 读取cookie中存的用户主题
 */
export const initDarkMode = (updateDarkMode, defaultDarkMode) => {
  // 查看用户设备浏览器是否深色模型
  let newDarkMode = isPreferDark()

  // 查看localStorage中用户记录的是否深色模式
  const userDarkMode = loadDarkModeFromLocalStorage()
  if (userDarkMode) {
    newDarkMode = userDarkMode === 'dark' || userDarkMode === 'true'
    saveDarkModeToLocalStorage(newDarkMode) // 用户手动的才保存
  }

  // 如果站点强制设置默认深色，则优先级改过用
  if (defaultDarkMode === 'true') {
    newDarkMode = true
  }

  // url查询条件中是否深色模式
  const queryMode = getQueryVariable('mode')
  if (queryMode) {
    newDarkMode = queryMode === 'dark'
  }

  updateDarkMode(newDarkMode)
  document
    .getElementsByTagName('html')[0]
    .setAttribute('class', newDarkMode ? 'dark' : 'light')

  // 如果是auto模式，监听系统主题变化
  if (BLOG.APPEARANCE === 'auto' && !userDarkMode) {
    setupSystemThemeListener(updateDarkMode)
  }
}

/**
 * 设置系统主题变化监听器
 * 当用户系统主题变化时自动切换深色/浅色模式
 */
export const setupSystemThemeListener = updateDarkMode => {
  if (typeof window === 'undefined') return

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  // 缓存用户设置状态，避免每次事件都读取localStorage
  let userHasManualPreference = !!loadDarkModeFromLocalStorage()

  const handleChange = e => {
    // 重新检查用户偏好（用户可能在此期间手动更改了设置）
    const currentUserPreference = loadDarkModeFromLocalStorage()
    userHasManualPreference = !!currentUserPreference

    // 只有当用户没有手动设置过主题时才自动切换
    if (!userHasManualPreference) {
      const newDarkMode = e.matches
      updateDarkMode(newDarkMode)
      const htmlElement = document.getElementsByTagName('html')[0]
      htmlElement.classList?.remove(newDarkMode ? 'light' : 'dark')
      htmlElement.classList?.add(newDarkMode ? 'dark' : 'light')
    }
  }

  // 添加事件监听器
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange)
  } else {
    // 兼容旧版浏览器
    mediaQuery.addListener(handleChange)
  }

  // 返回清理函数
  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleChange)
    } else {
      mediaQuery.removeListener(handleChange)
    }
  }
}

/**
 * 是否优先深色模式， 根据系统深色模式以及当前时间判断
 * @returns {*}
 */
export function isPreferDark() {
  if (BLOG.APPEARANCE === 'dark') {
    return true
  }
  if (BLOG.APPEARANCE === 'auto') {
    // 系统深色模式或时间是夜间时，强行置为夜间模式
    const date = new Date()
    const prefersDarkMode = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
    return (
      prefersDarkMode ||
      (BLOG.APPEARANCE_DARK_TIME &&
        (date.getHours() >= BLOG.APPEARANCE_DARK_TIME[0] ||
          date.getHours() < BLOG.APPEARANCE_DARK_TIME[1]))
    )
  }
  return false
}

/**
 * 读取深色模式
 * @returns {*}
 */
export const loadDarkModeFromLocalStorage = () => {
  return localStorage.getItem('darkMode')
}

/**
 * 保存深色模式
 * @param newTheme
 */
export const saveDarkModeToLocalStorage = newTheme => {
  localStorage.setItem('darkMode', newTheme)
}
