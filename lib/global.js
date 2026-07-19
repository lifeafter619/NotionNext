import {
  APPEARANCE,
  LANG,
  NOTION_PAGE_ID,
  THEME,
  THEME_LOCKED
} from '@/blog.config'
import {
  THEMES,
  getThemeConfig,
  initDarkMode,
  saveDarkModeToLocalStorage
} from '@/themes/theme'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { generateLocaleDict, initLocale, redirectUserLang } from './utils/lang'

/**
 * 全局上下文
 */
const GlobalContext = createContext()
let globalSnapshot = {}

// Notion 配置表里的布尔值可能是 true/'true'/'yes'/'on' 等多种写法，
// 这里做宽松判断（不能用 JSON.parse——非 JSON 字符串会抛错导致整站白屏）
const isTruthyConfigVal = val => {
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase()
    return s !== '' && s !== 'false' && s !== '0' && s !== 'no' && s !== 'off'
  }
  return Boolean(val)
}

export const getGlobalSnapshot = () => globalSnapshot

function isSearchRouteChange(url) {
  if (!url) return false

  try {
    const { pathname } = new URL(String(url), 'https://notionnext.local')
    const parts = pathname.split('/').filter(Boolean)
    return parts[0] === 'search' || parts[1] === 'search'
  } catch {
    const path = String(url).split('?')[0].split('#')[0]
    const parts = path.split('/').filter(Boolean)
    return parts[0] === 'search' || parts[1] === 'search'
  }
}

export function GlobalContextProvider(props) {
  const {
    post,
    children,
    siteInfo,
    categoryOptions,
    tagOptions,
    NOTION_CONFIG
  } = props

  const [lang, updateLang] = useState(NOTION_CONFIG?.LANG || LANG) // 默认语言
  const [locale, updateLocale] = useState(
    generateLocaleDict(NOTION_CONFIG?.LANG || LANG)
  ) // 默认语言
  const [theme, setTheme] = useState(NOTION_CONFIG?.THEME || THEME) // 默认博客主题
  const [THEME_CONFIG, SET_THEME_CONFIG] = useState(null) // 主题配置
  const [runtimeConfigOverrides, setRuntimeConfigOverrides] = useState({})
  const [isLiteMode, setLiteMode] = useState(false)

  const defaultDarkMode = NOTION_CONFIG?.APPEARANCE || APPEARANCE
  const [isDarkMode, updateDarkMode] = useState(defaultDarkMode === 'dark') // 默认深色模式
  const [onLoading, setOnLoading] = useState(false) // 抓取文章数据
  const router = useRouter()
  const themeConfigRequestRef = useRef(0)

  // 登录验证相关
  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const { isLoaded, isSignedIn, user } = enableClerk
    ? /* eslint-disable-next-line react-hooks/rules-of-hooks */
      useUser()
    : { isLoaded: true, isSignedIn: false, user: false }

  // 是否全屏
  const fullWidth = post?.fullWidth ?? false

  // 切换主题
  const switchTheme = useCallback(() => {
    if (THEME_LOCKED) {
      return theme
    }

    const queryTheme = Array.isArray(router.query.theme)
      ? router.query.theme[0]
      : router.query.theme
    const currentTheme = queryTheme || theme
    const currentIndex = THEMES.indexOf(currentTheme)
    const newIndex = currentIndex < THEMES.length - 1 ? currentIndex + 1 : 0
    const newTheme = THEMES[newIndex]
    const query = { ...router.query, theme: newTheme }
    void router.push({ pathname: router.pathname, query })
    return newTheme
  }, [router, theme])

  // 抓取主题配置
  const updateThemeConfig = useCallback(async theme => {
    const requestId = themeConfigRequestRef.current + 1
    themeConfigRequestRef.current = requestId
    const config = await getThemeConfig(theme)
    if (themeConfigRequestRef.current === requestId) {
      SET_THEME_CONFIG(config)
    }
  }, [])

  // 切换深色模式
  const toggleDarkMode = useCallback(() => {
    const newStatus = !isDarkMode
    saveDarkModeToLocalStorage(newStatus)
    updateDarkMode(newStatus)
    const htmlElement = document.getElementsByTagName('html')[0]
    htmlElement.classList?.remove(newStatus ? 'light' : 'dark')
    htmlElement.classList?.add(newStatus ? 'dark' : 'light')
  }, [isDarkMode])

  const changeLang = useCallback(lang => {
    if (lang) {
      updateLang(lang)
      updateLocale(generateLocaleDict(lang))
    }
  }, [])

  const updateRuntimeConfigOverride = useCallback((key, value) => {
    if (!key) return
    setRuntimeConfigOverrides(prev => ({ ...prev, [key]: value }))
  }, [])

  // 添加路由变化时的语言处理
  useEffect(() => {
    initLocale(router.locale, changeLang, updateLocale)
    // 处理极简模式
    setLiteMode(router.query.lite === 'true')
  }, [changeLang, router.locale, router.query.lite])

  // 首次加载成功
  useEffect(() => {
    initDarkMode(updateDarkMode, defaultDarkMode)
    // 处理多语言自动重定向；REDIRECT_LANG 来自 Notion 配置表，
    // 可能被填成 yes/on 等非 JSON 字符串，直接 JSON.parse 会导致整站白屏
    if (isTruthyConfigVal(NOTION_CONFIG?.REDIRECT_LANG)) {
      redirectUserLang(undefined, NOTION_PAGE_ID)
    }
    setOnLoading(false)
  }, [NOTION_CONFIG?.REDIRECT_LANG, defaultDarkMode])

  const currentTheme = useMemo(() => {
    if (THEME_LOCKED) return theme
    const queryTheme = router?.query?.theme
    return (Array.isArray(queryTheme) ? queryTheme[0] : queryTheme) || theme
  }, [router?.query?.theme, theme])

  useEffect(() => {
    void updateThemeConfig(currentTheme)
    return () => {
      themeConfigRequestRef.current += 1
    }
  }, [currentTheme, updateThemeConfig])

  useEffect(() => {
    const handleStart = url => {
      setOnLoading(!isSearchRouteChange(url))
    }
    const handleStop = () => {
      setOnLoading(false)
    }

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeError', handleStop)
    router.events.on('routeChangeComplete', handleStop)
    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleStop)
      router.events.off('routeChangeError', handleStop)
    }
  }, [router.events])

  const contextValue = useMemo(
    () => ({
      isLiteMode,
      isLoaded,
      isSignedIn,
      user,
      fullWidth,
      NOTION_CONFIG,
      THEME_CONFIG,
      runtimeConfigOverrides,
      updateRuntimeConfigOverride,
      toggleDarkMode,
      onLoading,
      setOnLoading,
      lang,
      changeLang,
      locale,
      updateLocale,
      isDarkMode,
      updateDarkMode,
      theme,
      setTheme,
      switchTheme,
      siteInfo,
      categoryOptions,
      tagOptions
    }),
    [
      isLiteMode,
      isLoaded,
      isSignedIn,
      user,
      fullWidth,
      NOTION_CONFIG,
      THEME_CONFIG,
      runtimeConfigOverrides,
      updateRuntimeConfigOverride,
      toggleDarkMode,
      onLoading,
      setOnLoading,
      lang,
      changeLang,
      locale,
      updateLocale,
      isDarkMode,
      updateDarkMode,
      theme,
      setTheme,
      switchTheme,
      siteInfo,
      categoryOptions,
      tagOptions
    ]
  )
  globalSnapshot = contextValue

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobal = () => useContext(GlobalContext)
