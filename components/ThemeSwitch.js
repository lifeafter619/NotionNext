import { getThemeSwitchMeta } from '@/conf/themeSwitch.manifest'
import { useGlobal } from '@/lib/global'
import { getQueryParam } from '@/lib/utils'
import { THEMES } from '@/themes/theme'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Draggable } from './Draggable'
import { Moon, Sun } from './HeroIcons'
import LazyImage from './LazyImage'
import SideBarDrawer from './SideBarDrawer'

function ThemeTierBadge ({ tier, labels }) {
  const isPaid = tier === 'paid'
  const text = isPaid ? labels.paid : labels.free
  const cls = isPaid
    ? 'border-amber-200/90 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/45 dark:text-amber-200'
    : 'border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-200'
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${cls}`}
      title={text}>
      {text}
    </span>
  )
}

/**
 *
 * @returns 主题切换
 */
const ThemeSwitch = () => {
  const { theme, locale, isDarkMode, toggleDarkMode } = useGlobal()
  const router = useRouter()
  const currentTheme = getQueryParam(router.asPath, 'theme') || theme
  const [sideBarVisible, setSideBarVisible] = useState(false)

  const currentMeta = getThemeSwitchMeta(currentTheme)
  const tierLabels = {
    free: locale.COMMON?.THEME_TIER_FREE ?? 'Free',
    paid: locale.COMMON?.THEME_TIER_PAID ?? 'Paid'
  }

  const changeTheme = newTheme => {
    const query = router.query
    query.theme = newTheme
    router.push({ pathname: router.pathname, query }).then(() => {})
  }

  return (
    <>
      {/* 悬浮的主题切换按钮 */}
      <Draggable stick={true}>
        <div
          id='draggableBox'
          style={{ left: '0px', top: '80vh' }}
          className={`group fixed z-50 flex max-w-[min(100vw-1rem,16rem)] select-none flex-col items-stretch overflow-hidden rounded-2xl border p-1.5 backdrop-blur-md transition ${
            isDarkMode
              ? 'border-gray-500/45 bg-gray-950/[0.97] shadow-[0_8px_32px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.08] hover:border-gray-400/55 hover:shadow-[0_14px_44px_rgba(0,0,0,0.62)]'
              : 'border-gray-200/80 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5 hover:border-gray-300/90 hover:shadow-[0_12px_40px_rgb(0,0,0,0.15)]'
          }`}>
          {/* 悬浮入口：明暗随 isDarkMode，与 html.dark / 切换按钮一致 */}
          <div className='flex min-h-[3rem] items-center gap-2.5 pl-0.5 pr-1 duration-200 group-hover:gap-3'>
            <span
              className={`relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white shadow-md ring-2 transition active:scale-95 ${
                isDarkMode
                  ? 'bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 ring-white/18'
                  : 'bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 ring-white/30'
              }`}
              onClick={() => {
                setSideBarVisible(true)
              }}
              onTouchStart={() => {
                setSideBarVisible(true)
              }}
              title='Open theme panel'>
              <span
                className={`absolute inset-0 rounded-xl bg-gradient-to-t to-transparent ${
                  isDarkMode ? 'from-black/25' : 'from-black/10'
                }`}
              />
              <i className='fa-solid fa-palette relative text-[15px]' aria-hidden />
            </span>
            <div className='min-w-0 flex-1 overflow-hidden py-0.5'>
              <label htmlFor='themeSelect' className='sr-only'>
                {locale.COMMON.THEME}
              </label>
              <button
                id='themeSelect'
                type='button'
                className={`w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/80 focus-visible:ring-offset-2 ${
                  isDarkMode
                    ? 'focus-visible:ring-indigo-400 focus-visible:ring-offset-gray-950'
                    : 'focus-visible:ring-offset-white'
                }`}
                onClick={() => {
                  setSideBarVisible(true)
                }}
                title='Click To Switch Theme'>
                <span
                  className={`block text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  {locale.MENU.THEME_SWITCH}
                </span>
                <span className='mt-0.5 flex min-w-0 items-center gap-1.5'>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-semibold leading-snug ${
                      isDarkMode ? 'text-gray-50' : 'text-gray-900'
                    }`}>
                    {currentMeta.name}
                  </span>
                  <ThemeTierBadge tier={currentMeta.tier} labels={tierLabels} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </Draggable>

      <SideBarDrawer
        className='flex max-h-screen w-[min(100vw-0.5rem,28rem)] flex-col overflow-hidden border-r border-gray-200/90 bg-white p-0 shadow-2xl dark:border-gray-800 dark:bg-gray-950 md:w-[min(100vw-2rem,48rem)] lg:w-[min(100vw-3rem,56rem)]'
        isOpen={sideBarVisible}
        showOnPC={true}
        onClose={() => {
          setSideBarVisible(false)
        }}>
        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
          <div className='sticky top-0 z-[1] border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500'>
                  {locale.MENU.THEME_SWITCH}
                </p>
                <p className='mt-0.5 truncate text-sm text-gray-600 dark:text-gray-300'>
                  {locale.COMMON.THEME_SWITCH}
                </p>
              </div>
              <button
                type='button'
                className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white'
                onClick={() => {
                  setSideBarVisible(false)
                }}>
                <i className='fas fa-times' />
              </button>
            </div>
          </div>

          <div className='space-y-6 px-5 pb-10 pt-6'>
            {/* 明暗切换：整行可点，仍为 toggleDarkMode */}
            <button
              type='button'
              onClick={toggleDarkMode}
              aria-label={
                isDarkMode ? '切换为浅色模式' : '切换为深色模式'
              }
              className='flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-indigo-200/90 bg-gradient-to-r from-sky-50 via-white to-violet-50 px-4 py-3.5 text-left shadow-sm ring-1 ring-indigo-100/80 transition hover:border-indigo-400 hover:shadow-md active:scale-[0.99] dark:border-indigo-500/40 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/60 dark:ring-indigo-500/20 dark:hover:border-indigo-400/70'>
              <span className='flex min-w-0 flex-1 items-center gap-3'>
                <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-md ring-1 ring-gray-200 dark:bg-gray-800 dark:text-amber-300 dark:ring-gray-600 [&_svg]:h-7 [&_svg]:w-7'>
                  {isDarkMode ? <Sun /> : <Moon />}
                </span>
                <span className='min-w-0'>
                  <span className='block text-sm font-semibold text-gray-900 dark:text-white'>
                    {isDarkMode ? locale.MENU.DARK_MODE : locale.MENU.LIGHT_MODE}
                  </span>
                  <span className='mt-0.5 block text-xs text-gray-600 dark:text-gray-400'>
                    {isDarkMode
                      ? '点击切换为浅色模式'
                      : '点击切换为深色模式'}
                  </span>
                </span>
              </span>
              <span
                className={`relative inline-flex h-9 w-[3.35rem] shrink-0 items-center rounded-full border border-transparent shadow-inner transition-colors ${
                  isDarkMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-hidden>
                <span
                  className={`pointer-events-none absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow ring-1 ring-black/10 transition-transform duration-200 ease-out ${
                    isDarkMode ? 'translate-x-[1.35rem]' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>

            <div>
              <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                点击下方主题进行切换.
              </p>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                Click below to switch the theme.
              </p>
            </div>

            {/* 陈列所有主题 — 仍为同一 map + changeTheme(t) */}
            <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
              {THEMES?.map(t => {
                const active = currentTheme === t
                const meta = getThemeSwitchMeta(t)
                return (
                  <div
                    className={`cursor-pointer rounded-2xl border bg-white p-1.5 shadow-sm transition dark:bg-gray-900/40 ${
                      active
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 dark:border-indigo-400'
                        : 'border-gray-100 hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:hover:border-indigo-500/40'
                    }`}
                    key={t}
                    onClick={() => {
                      changeTheme(t)
                    }}>
                    <div className='mb-1 flex flex-wrap items-center justify-center gap-1.5 px-1 text-center'>
                      <span className='min-w-0 truncate text-xs font-semibold tracking-wide text-gray-800 dark:text-gray-100'>
                        {meta.name}
                      </span>
                      <ThemeTierBadge tier={meta.tier} labels={tierLabels} />
                    </div>
                    {meta.summary ? (
                      <p className='mb-2 line-clamp-2 px-1 text-center text-[11px] leading-snug text-gray-500 dark:text-gray-400'>
                        {meta.summary}
                      </p>
                    ) : null}
                    <div className='relative overflow-hidden rounded-xl'>
                      <LazyImage
                        src={meta.coverWebp || meta.coverPng}
                        fallbackSrc={meta.coverPng}
                        alt={`${meta.name} preview`}
                        className='w-full cursor-pointer rounded-xl object-cover shadow-inner transition duration-300 hover:scale-[1.02]'
                      />
                      {active && (
                        <span className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs text-white shadow-lg'>
                          <i className='fas fa-check' />
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </SideBarDrawer>
    </>
  )
}

export default ThemeSwitch
