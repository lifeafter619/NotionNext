import dynamic from 'next/dynamic'

const EmptyBaseLayout = ({ children }) => <>{children}</>
const EmptyPageLayout = () => null

const ThemeLayoutLoading = () => (
  <div
    data-theme-layout-loading
    aria-hidden='true'
    className='min-h-screen w-full bg-[#f6f6f1] dark:bg-black'
  />
)

function getThemeExport(mod, exportName) {
  if (mod?.[exportName]) return mod[exportName]
  if (mod?.default?.[exportName]) return mod.default[exportName]
  if (exportName === 'LayoutBase' && typeof mod?.default === 'function') {
    return mod.default
  }
  return null
}

function createThemeLayout(themeName, themeModule) {
  const ThemeLayout = props => {
    const layoutName = props.layoutName || 'LayoutBase'
    const Layout =
      getThemeExport(themeModule, layoutName) ||
      (layoutName === 'LayoutBase'
        ? EmptyBaseLayout
        : getThemeExport(themeModule, 'LayoutSlug') || EmptyPageLayout)

    return <Layout {...props} />
  }

  ThemeLayout.displayName = `${themeName}ThemeLayout`
  return ThemeLayout
}

function resolveThemeModule(themeName, mod) {
  return createThemeLayout(themeName, mod)
}

// Keep every dynamic() call at module scope and every import() path literal.
// Next.js uses this static shape to associate webpack module ids with the
// server render and preload the selected theme chunk before hydration.
export const DYNAMIC_THEME_LAYOUTS = {
  claude: dynamic(
    () =>
      import('@/themes/claude').then(mod => resolveThemeModule('claude', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  commerce: dynamic(
    () =>
      import('@/themes/commerce').then(mod =>
        resolveThemeModule('commerce', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  endspace: dynamic(
    () =>
      import('@/themes/endspace').then(mod =>
        resolveThemeModule('endspace', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  example: dynamic(
    () =>
      import('@/themes/example').then(mod =>
        resolveThemeModule('example', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  fukasawa: dynamic(
    () =>
      import('@/themes/fukasawa').then(mod =>
        resolveThemeModule('fukasawa', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  fuwari: dynamic(
    () =>
      import('@/themes/fuwari').then(mod => resolveThemeModule('fuwari', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  game: dynamic(
    () => import('@/themes/game').then(mod => resolveThemeModule('game', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  gitbook: dynamic(
    () =>
      import('@/themes/gitbook').then(mod =>
        resolveThemeModule('gitbook', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  heo: dynamic(
    () => import('@/themes/heo').then(mod => resolveThemeModule('heo', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  hexo: dynamic(
    () => import('@/themes/hexo').then(mod => resolveThemeModule('hexo', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  landing: dynamic(
    () =>
      import('@/themes/landing').then(mod =>
        resolveThemeModule('landing', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  magzine: dynamic(
    () =>
      import('@/themes/magzine').then(mod =>
        resolveThemeModule('magzine', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  matery: dynamic(
    () =>
      import('@/themes/matery').then(mod => resolveThemeModule('matery', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  medium: dynamic(
    () =>
      import('@/themes/medium').then(mod => resolveThemeModule('medium', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  movie: dynamic(
    () =>
      import('@/themes/movie').then(mod => resolveThemeModule('movie', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  nav: dynamic(
    () => import('@/themes/nav').then(mod => resolveThemeModule('nav', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  next: dynamic(
    () => import('@/themes/next').then(mod => resolveThemeModule('next', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  nobelium: dynamic(
    () =>
      import('@/themes/nobelium').then(mod =>
        resolveThemeModule('nobelium', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  opc: dynamic(
    () => import('@/themes/opc').then(mod => resolveThemeModule('opc', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  photo: dynamic(
    () =>
      import('@/themes/photo').then(mod => resolveThemeModule('photo', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  plog: dynamic(
    () => import('@/themes/plog').then(mod => resolveThemeModule('plog', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  proxio: dynamic(
    () =>
      import('@/themes/proxio').then(mod => resolveThemeModule('proxio', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  simple: dynamic(
    () =>
      import('@/themes/simple').then(mod => resolveThemeModule('simple', mod)),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  starter: dynamic(
    () =>
      import('@/themes/starter').then(mod =>
        resolveThemeModule('starter', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  thoughtlite: dynamic(
    () =>
      import('@/themes/thoughtlite').then(mod =>
        resolveThemeModule('thoughtlite', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  ),
  typography: dynamic(
    () =>
      import('@/themes/typography').then(mod =>
        resolveThemeModule('typography', mod)
      ),
    { ssr: true, loading: ThemeLayoutLoading }
  )
}

export function getDynamicThemeLayout(themeName) {
  return DYNAMIC_THEME_LAYOUTS[themeName] || null
}
