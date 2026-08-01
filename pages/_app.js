// import '@/styles/animate.css' // @see https://animate.style/
import '@/styles/globals.css'
import '@/styles/utility-patterns.css'

// core styles shared by all of react-notion-x (required)
import 'react-notion-x/src/styles.css' // 原版的react-notion-x
import '@/styles/notion.css' //  重写部分notion样式
import '@/styles/prism-code.css' // 内置代码块主题与行号对齐样式（需在 notion 样式之后引入）

import useAdjustStyle from '@/hooks/useAdjustStyle'
import { GlobalContextProvider } from '@/lib/global'
import { ImageViewerProvider } from '@/lib/ImageViewerContext'
import { getBaseLayoutByTheme } from '@/themes/theme'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo } from 'react'
import { getQueryParam } from '../lib/utils'
import ErrorHandler from '@/lib/utils/errorHandler'

// 各种扩展插件 这个要阻塞引入
import BLOG from '@/blog.config'
import ExternalPlugins from '@/components/ExternalPlugins'
import SEO from '@/components/SEO'
import dynamic from 'next/dynamic'
// import { ClerkProvider } from '@clerk/nextjs'
// Clerk 及其中文语言包只在配置了 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 时才会
// 被用到；全部走动态加载，避免语言包被打进所有访客的首屏 bundle。
// 语言包必须用 /zh-CN 子路径：裸 import('@clerk/localizations') 会把全部
// 语言打成一个 ~670KB gzip 的 chunk，每个页面都要下载
const ClerkProvider = dynamic(() =>
  Promise.all([
    import('@clerk/nextjs'),
    import('@clerk/localizations/zh-CN')
  ]).then(([clerk, localizations]) => {
    const ClerkProviderWithLocale = ({ children }) => (
      <clerk.ClerkProvider localization={localizations.zhCN}>
        {children}
      </clerk.ClerkProvider>
    )
    return ClerkProviderWithLocale
  })
)
const AppErrorBoundary = ErrorHandler.createErrorBoundary(
  <div
    style={{
      padding: '2rem',
      textAlign: 'center',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
    <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
      Something went wrong
    </h1>
    <p style={{ color: '#666', marginBottom: '1.5rem' }}>
      An unexpected error occurred. Please refresh the page.
    </p>
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: '0.5rem 1.5rem',
        cursor: 'pointer',
        border: '1px solid #ccc',
        borderRadius: '4px',
        background: 'transparent'
      }}>
      Refresh
    </button>
  </div>
)

/**
 * App挂载DOM 入口文件
 * @param {*} param0
 * @returns
 */
const MyApp = ({ Component, pageProps }) => {
  // 一些可能出现 bug 的样式，可以统一放入该钩子进行调整
  useAdjustStyle()

  const route = useRouter()
  const queryTheme = BLOG.THEME_LOCKED
    ? null
    : getQueryParam(route.asPath, 'theme')
  const notionTheme = pageProps?.NOTION_CONFIG?.THEME
  const configTheme = BLOG.THEME
  const theme = useMemo(() => {
    return queryTheme || notionTheme || configTheme
  }, [queryTheme, notionTheme, configTheme])

  useEffect(() => {
    const source = queryTheme
      ? 'url:theme'
      : notionTheme
        ? 'notion:config'
        : 'blog/env:config'
    console.log(
      '[ThemeResolver][runtime-final]',
      JSON.stringify(
        {
          note: 'This is the final theme used for rendering.',
          configTheme,
          notionTheme: notionTheme || null,
          queryTheme: queryTheme || null,
          finalTheme: theme,
          source
        },
        null,
        2
      )
    )
  }, [configTheme, notionTheme, queryTheme, theme])

  // 整体布局
  const GLayout = useCallback(
    props => {
      const Layout = getBaseLayoutByTheme(theme)
      return <Layout {...props} />
    },
    [theme]
  )

  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const content = (
    <AppErrorBoundary>
      <GlobalContextProvider {...pageProps}>
        <ImageViewerProvider>
          <GLayout {...pageProps}>
            <SEO {...pageProps} />
            <Component {...pageProps} />
          </GLayout>
          <ExternalPlugins {...pageProps} />
        </ImageViewerProvider>
      </GlobalContextProvider>
    </AppErrorBoundary>
  )
  return (
    <>
      {enableClerk ? (
        <ClerkProvider>{content}</ClerkProvider>
      ) : (
        content
      )}
    </>
  )
}

export default MyApp
