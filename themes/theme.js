import BLOG, { LAYOUT_MAPPINGS } from '@/blog.config'
import { THEMES } from '@/conf/theme.config'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { getQueryParam, getQueryVariable, isBrowser } from '../lib/utils'

export { THEMES } from '@/conf/theme.config'

const baseLayoutCache = new Map()
const layoutByThemeCache = new Map()

const LayoutLoading = () => (
  <div className='min-h-screen w-full bg-[#f6f6f1] dark:bg-black' />
)

const EmptyBaseLayout = ({ children }) => <>{children}</>
const EmptyPageLayout = () => null

const IndexLayoutLoading = () => (
  <div className='pt-10 md:pt-18 w-full bg-[#f6f6f1] dark:bg-black'>
    <div className='mx-auto w-full max-w-screen-3xl px-4 py-10 lg:px-0'>
      <div className='grid gap-10 xl:grid-cols-2'>
        <section className='space-y-5'>
          <div className='h-80 w-full animate-pulse bg-gray-200 dark:bg-gray-800' />
          <div className='h-10 w-4/5 animate-pulse bg-gray-200 dark:bg-gray-800' />
          <div className='h-4 w-2/3 animate-pulse bg-gray-200 dark:bg-gray-800' />
          <div className='h-4 w-24 animate-pulse bg-gray-200 dark:bg-gray-800' />
        </section>
        <section className='space-y-6'>
          <div className='h-48 w-full animate-pulse bg-gray-200 dark:bg-gray-800' />
          {[0, 1].map(item => (
            <div
              key={item}
              className='flex gap-6 border-t border-gray-300 pt-6 dark:border-gray-800'>
              <div className='min-w-0 flex-1 space-y-3'>
                <div className='h-6 w-4/5 animate-pulse bg-gray-200 dark:bg-gray-800' />
                <div className='h-4 w-2/3 animate-pulse bg-gray-200 dark:bg-gray-800' />
                <div className='h-4 w-20 animate-pulse bg-gray-200 dark:bg-gray-800' />
              </div>
              <div className='h-32 w-32 shrink-0 animate-pulse bg-gray-200 dark:bg-gray-800' />
            </div>
          ))}
        </section>
      </div>

      <section className='mt-12'>
        <div className='flex items-center justify-between'>
          <div className='h-7 w-28 animate-pulse bg-gray-200 dark:bg-gray-800' />
          <div className='h-5 w-24 animate-pulse bg-gray-200 dark:bg-gray-800' />
        </div>
        <div className='mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-4'>
          {[0, 1, 2, 3].map(item => (
            <div
              key={item}
              className='space-y-4 border-t border-gray-300 pt-5 dark:border-gray-800'>
              <div className='h-5 w-3/4 animate-pulse bg-gray-200 dark:bg-gray-800' />
              <div className='h-4 w-24 animate-pulse bg-gray-200 dark:bg-gray-800' />
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
)

const getLayoutLoading = layoutName => {
  if (layoutName === 'LayoutIndex') {
    return IndexLayoutLoading
  }
  return LayoutLoading
}

const normalizeThemeName = themeValue => {
  if (!themeValue || typeof themeValue !== 'string') return BLOG.THEME
  const firstTheme = themeValue.split(',')[0].trim()
  if (!firstTheme) return BLOG.THEME
  return THEMES.includes(firstTheme) ? firstTheme : BLOG.THEME
}

const getFallbackThemeName = themeName => {
  const preferred = normalizeThemeName(BLOG.THEME)
  if (preferred && preferred !== themeName) return preferred
  if (THEMES.includes('example') && themeName !== 'example') return 'example'
  return THEMES.find(item => item !== themeName) || null
}

const getThemeExport = (mod, exportName) => {
  if (mod?.[exportName]) return mod[exportName]
  if (mod?.default?.[exportName]) return mod.default[exportName]
  if (exportName === 'LayoutBase' && typeof mod?.default === 'function') {
    return mod.default
  }
  return null
}

const scheduleFixThemeDOM = (delay = 120) => {
  if (!isBrowser) return () => {}
  const timer = window.setTimeout(() => {
    fixThemeDOM()
  }, delay)

  return () => {
    window.clearTimeout(timer)
  }
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

async function importThemeLayout(themeFolderName, layoutName) {
  try {
    const mod = await import(`@/themes/${themeFolderName}`)
    return (
      getThemeExport(mod, layoutName) ||
      getThemeExport(mod, 'LayoutSlug') ||
      null
    )
  } catch (err) {
    console.error(`Failed to load theme "${themeFolderName}":`, err)
    return null
  }
}

async function resolveThemeLayout(themeName, layoutName, emptyLayout) {
  let Layout = await importThemeLayout(themeName, layoutName)
  if (Layout) return Layout

  const fallback = getFallbackThemeName(themeName)
  if (fallback) {
    Layout = await importThemeLayout(fallback, layoutName)
    if (Layout) {
      console.warn(
        `[theme] "${themeName}" missing "${layoutName}", using fallback "${fallback}".`
      )
      return Layout
    }
  }

  console.warn(`[theme] "${themeName}" missing "${layoutName}", using empty layout.`)
  return emptyLayout
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
  console.warn('[theme] No theme configuration could be loaded, using empty config.')
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
  if (baseLayoutCache.has(normalizedTheme)) {
    return baseLayoutCache.get(normalizedTheme)
  }
  const DynamicBaseLayout = dynamic(
    () =>
      resolveThemeLayout(normalizedTheme, 'LayoutBase', EmptyBaseLayout),
    { ssr: true }
  )
  baseLayoutCache.set(normalizedTheme, DynamicBaseLayout)
  return DynamicBaseLayout
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
  const cacheKey = `${themeQuery}:${layoutName}`

  useEffect(() => {
    return scheduleFixThemeDOM(themeQuery === BLOG.THEME ? 80 : 240)
  }, [layoutName, themeQuery])

  if (layoutByThemeCache.has(cacheKey)) {
    return layoutByThemeCache.get(cacheKey)
  }

  const loadLayout = () =>
    resolveThemeLayout(themeQuery, layoutName, EmptyPageLayout)
  const DynamicLayoutComponent = dynamic(loadLayout, {
    ssr: true,
    loading: getLayoutLoading(layoutName)
  })
  layoutByThemeCache.set(cacheKey, DynamicLayoutComponent)
  return DynamicLayoutComponent
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
      const retainedElement = elements[elements.length - 1]
      for (let i = 0; i < elements.length - 1; i++) {
        if (
          elements[i] &&
          elements[i].parentNode &&
          elements[i].parentNode.contains(elements[i])
        ) {
          elements[i].parentNode.removeChild(elements[i])
        }
      }
      retainedElement?.scrollIntoView()
    }
  }
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
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
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
