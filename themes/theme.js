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
    return mod?.THEME_CONFIG ?? null
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
  console.error('[theme] No theme configuration could be loaded.')
  return null
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
      import(`@/themes/${normalizedTheme}`).then(m => {
        const Base = m['LayoutBase']
        if (!Base) {
          throw new Error(
            `[theme] LayoutBase missing in themes/${normalizedTheme}`
          )
        }
        return Base
      }),
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
    import(`@/themes/${themeQuery}`).then(componentsSource => {
      const Selected =
        componentsSource[layoutName] || componentsSource.LayoutSlug
      if (!Selected) {
        throw new Error(
          `[theme] Layout "${layoutName}" missing in themes/${themeQuery}`
        )
      }
      return Selected
    })
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

/**
 * 初始化主题 , 优先级 query > cookies > systemPrefer
 * @param isDarkMode
 * @param updateDarkMode 更改主题ChangeState函数
 * @description 读取cookie中存的用户主题
 */
export const initDarkMode = (updateDarkMode, defaultDarkMode) => {
  let newDarkMode = getDefaultDarkMode(defaultDarkMode)

  // 查看localStorage中用户记录的是否深色模式
  const userDarkMode = loadDarkModeFromLocalStorage()
  if (userDarkMode) {
    newDarkMode = userDarkMode === 'dark' || userDarkMode === 'true'
    saveDarkModeToLocalStorage(newDarkMode) // 用户手动的才保存
  }

  // url查询条件中是否深色模式
  const queryMode = getQueryVariable('mode')
  if (queryMode) {
    newDarkMode = queryMode === 'dark'
  }

  updateDarkMode(newDarkMode)
  const htmlElement = document.documentElement
  htmlElement.classList.remove('dark', 'light')
  htmlElement.classList.add(newDarkMode ? 'dark' : 'light')
}

function getDefaultDarkMode(defaultDarkMode) {
  if (defaultDarkMode === true) return true
  if (defaultDarkMode === false) return false

  if (typeof defaultDarkMode === 'string') {
    const normalizedDefault = defaultDarkMode.toLowerCase()
    if (normalizedDefault === 'true' || normalizedDefault === 'dark') {
      return true
    }
    if (normalizedDefault === 'false' || normalizedDefault === 'light') {
      return false
    }
  }

  // 查看用户设备浏览器是否深色模型
  return isPreferDark()
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
    const darkTime = Array.isArray(BLOG.APPEARANCE_DARK_TIME)
      ? BLOG.APPEARANCE_DARK_TIME
      : null
    const darkTimeStart = Number(darkTime?.[0])
    const darkTimeEnd = Number(darkTime?.[1])
    const isDarkTime =
      darkTime &&
      Number.isFinite(darkTimeStart) &&
      Number.isFinite(darkTimeEnd) &&
      (date.getHours() >= darkTimeStart || date.getHours() < darkTimeEnd)

    return prefersDarkMode || Boolean(isDarkTime)
  }
  return false
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
    localStorage.setItem('darkMode', newTheme)
  } catch {}
}
