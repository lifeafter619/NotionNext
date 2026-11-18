import BLOG, { LAYOUT_MAPPINGS } from '@/blog.config'
import { THEMES } from '@/conf/theme.config'
import { useRouter } from 'next/router'
import { getQueryParam, getQueryVariable } from '../lib/utils'
import { getDynamicThemeLayout } from './dynamicThemeLayouts'

export { THEMES } from '@/conf/theme.config'

const normalizeThemeName = themeValue => {
  if (!themeValue || typeof themeValue !== 'string') return BLOG.THEME
  const firstTheme = themeValue.split(',')[0].trim()
  if (!firstTheme) return BLOG.THEME
  return THEMES.includes(firstTheme) ? firstTheme : BLOG.THEME
}

const getThemeExport = (mod, exportName) => {
  if (mod?.[exportName]) return mod[exportName]
  if (mod?.default?.[exportName]) return mod.default[exportName]
  if (exportName === 'LayoutBase' && typeof mod?.default === 'function') {
    return mod.default
  }
  return null
}

async function importThemeConfig(themeFolderName) {
  try {
    const mod = await import(`@/themes/${themeFolderName}`)
    return getThemeExport(mod, 'THEME_CONFIG')
  } catch (err) {
    console.error(`Failed to load theme config "${themeFolderName}":`, err)
    return null
  }
}

/**
 * 获取主题配置（始终动态加载，与运行时 BLOG.THEME / URL ?theme 一致；不依赖编译期别名）。
 * @param {string} themeQuery - 主题查询参数（支持多个主题用逗号分隔）
 * @returns {Promise<object|null>} 主题配置对象
 */
export const getThemeConfig = async themeQuery => {
  const themeName = normalizeThemeName(themeQuery)
  let cfg = await importThemeConfig(themeName)
  if (cfg) {
    return cfg
  }
  const fallback = normalizeThemeName(BLOG.THEME)
  if (fallback !== themeName) {
    cfg = await importThemeConfig(fallback)
    if (cfg) {
      console.warn(
        `[theme] "${themeName}" config unavailable, using fallback "${fallback}".`
      )
      return cfg
    }
  }
  console.warn(
    '[theme] No theme configuration could be loaded, using empty config.'
  )
  return {}
}

/**
 * 获取当前主题（query 主题优先，且做合法性校验）
 */
const getCurrentTheme = (router, fallbackTheme) => {
  if (!BLOG.THEME_LOCKED) {
    const queryTheme = getQueryParam(router?.asPath, 'theme')
    if (queryTheme) {
      return normalizeThemeName(queryTheme)
    }
  }
  return normalizeThemeName(fallbackTheme || BLOG.THEME)
}

/**
 * 加载全局布局
 * @param {*} theme
 * @returns
 */
export const getBaseLayoutByTheme = theme => {
  const normalizedTheme = normalizeThemeName(theme)
  return (
    getDynamicThemeLayout(normalizedTheme) ||
    getDynamicThemeLayout(normalizeThemeName(BLOG.THEME))
  )
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
  const router = useRouter()
  const themeQuery = getCurrentTheme(router, theme)

  return (
    getDynamicThemeLayout(themeQuery) ||
    getDynamicThemeLayout(normalizeThemeName(BLOG.THEME))
  )
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

export const APPEARANCE_MODE = Object.freeze({
  LIGHT: 'light',
  SYSTEM: 'system',
  DARK: 'dark'
})

/**
 * Normalize legacy boolean/auto values into the three supported UI modes.
 */
export const normalizeAppearanceMode = (
  value,
  fallback = APPEARANCE_MODE.SYSTEM
) => {
  if (value === true) return APPEARANCE_MODE.DARK
  if (value === false) return APPEARANCE_MODE.LIGHT

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === APPEARANCE_MODE.DARK) {
      return APPEARANCE_MODE.DARK
    }
    if (normalized === 'false' || normalized === APPEARANCE_MODE.LIGHT) {
      return APPEARANCE_MODE.LIGHT
    }
    if (normalized === 'auto' || normalized === APPEARANCE_MODE.SYSTEM) {
      return APPEARANCE_MODE.SYSTEM
    }
  }

  return fallback
}

const applyResolvedDarkMode = (isDarkMode, updateDarkMode) => {
  updateDarkMode(Boolean(isDarkMode))
  const htmlElement = document.documentElement
  htmlElement.classList.remove('dark', 'light')
  htmlElement.classList.add(isDarkMode ? 'dark' : 'light')
}

export const applyAppearanceMode = (appearanceMode, updateDarkMode) => {
  const normalizedMode = normalizeAppearanceMode(appearanceMode)
  const isDarkMode =
    normalizedMode === APPEARANCE_MODE.DARK ||
    (normalizedMode === APPEARANCE_MODE.SYSTEM && isPreferDark())
  applyResolvedDarkMode(isDarkMode, updateDarkMode)
  return normalizedMode
}

/**
 * Initialize appearance with query > saved preference > configured default.
 */
export const initDarkMode = (
  updateDarkMode,
  defaultDarkMode,
  updateAppearanceMode
) => {
  let appearanceMode = normalizeAppearanceMode(defaultDarkMode)
  const savedMode = loadDarkModeFromLocalStorage()
  if (savedMode !== null) {
    appearanceMode = normalizeAppearanceMode(savedMode, appearanceMode)
  }

  const queryMode = getQueryVariable('mode')
  if (queryMode) {
    appearanceMode = normalizeAppearanceMode(queryMode, appearanceMode)
  }

  applyAppearanceMode(appearanceMode, updateDarkMode)
  updateAppearanceMode?.(appearanceMode)
  return appearanceMode
}

/**
 * Follow operating-system changes while system mode is selected.
 */
export const subscribeToSystemAppearance = updateDarkMode => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = event => {
    applyResolvedDarkMode(Boolean(event.matches), updateDarkMode)
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener?.('change', handleChange)
  }

  mediaQuery.addListener?.(handleChange)
  return () => mediaQuery.removeListener?.(handleChange)
}

/**
 * Whether the operating system currently prefers a dark color scheme.
 */
export function isPreferDark() {
  return Boolean(
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/**
 * 读取深色模式
 * @returns {*}
 */
export const loadDarkModeFromLocalStorage = () => {
  try {
    return localStorage.getItem('darkMode')
  } catch {
    return null
  }
}

/**
 * 保存深色模式
 * @param newTheme
 */
export const saveDarkModeToLocalStorage = newTheme => {
  try {
    localStorage.setItem('darkMode', normalizeAppearanceMode(newTheme))
  } catch {}
}
