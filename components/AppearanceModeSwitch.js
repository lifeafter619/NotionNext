import { Moon, Sun } from '@/components/HeroIcons'
import { useGlobal } from '@/lib/global'
import { APPEARANCE_MODE } from '@/themes/theme'
import { IconDeviceDesktop, IconDeviceMobile } from '@tabler/icons-react'
import { useImperativeHandle } from 'react'

const AppearanceModeSwitch = ({
  cRef,
  className = '',
  buttonClassName = '',
  fullWidth = false
}) => {
  const { appearanceMode, setAppearanceMode, locale } = useGlobal()
  const labels = {
    [APPEARANCE_MODE.LIGHT]: locale?.MENU?.LIGHT_MODE || 'Light mode',
    [APPEARANCE_MODE.SYSTEM]:
      locale?.MENU?.SYSTEM_MODE || 'Follow system',
    [APPEARANCE_MODE.DARK]: locale?.MENU?.DARK_MODE || 'Dark mode'
  }

  useImperativeHandle(cRef, () => ({
    handleChangeDarkMode: () => {
      setAppearanceMode(
        appearanceMode === APPEARANCE_MODE.DARK
          ? APPEARANCE_MODE.LIGHT
          : APPEARANCE_MODE.DARK
      )
    },
    setAppearanceMode
  }))

  const options = [
    {
      mode: APPEARANCE_MODE.LIGHT,
      icon: <Sun className='h-5 w-5' />
    },
    {
      mode: APPEARANCE_MODE.SYSTEM,
      icon: (
        <>
          <IconDeviceMobile
            aria-hidden='true'
            className='h-5 w-5 md:hidden'
            data-testid='system-mobile-icon'
          />
          <IconDeviceDesktop
            aria-hidden='true'
            className='hidden h-5 w-5 md:block'
            data-testid='system-desktop-icon'
          />
        </>
      )
    },
    {
      mode: APPEARANCE_MODE.DARK,
      icon: <Moon className='h-5 w-5' />
    }
  ]

  return (
    <div
      role='group'
      aria-label={locale?.MENU?.APPEARANCE || 'Appearance'}
      className={`${fullWidth ? 'flex w-full' : 'inline-flex'} items-center gap-1 rounded-xl border border-gray-200 bg-white/90 p-1 text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300 ${className}`}>
      {options.map(({ mode, icon }) => {
        const active = appearanceMode === mode
        return (
          <button
            key={mode}
            type='button'
            aria-label={labels[mode]}
            aria-pressed={active}
            title={labels[mode]}
            onClick={() => setAppearanceMode(mode)}
            className={`${fullWidth ? 'min-h-11 flex-1' : 'h-9 w-9'} flex shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-gray-900 ${
              active
                ? 'bg-indigo-600 text-white shadow-sm dark:bg-amber-400 dark:text-gray-950'
                : 'hover:bg-gray-100 hover:text-gray-950 dark:hover:bg-gray-800 dark:hover:text-white'
            } ${buttonClassName}`}>
            <span aria-hidden='true' className='flex items-center justify-center'>
              {icon}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default AppearanceModeSwitch
