import { useGlobal } from '@/lib/global'
import { saveDarkModeToLocalStorage } from '@/themes/theme'
import { Moon, Sun } from '@/components/HeroIcons'
import { useImperativeHandle } from 'react'

/**
 * 深色模式按钮
 */
const DarkModeButton = props => {
  const { cRef, className } = props
  const { isDarkMode, updateDarkMode, locale } = useGlobal()
  const label = isDarkMode
    ? locale?.MENU?.LIGHT_MODE || 'Light mode'
    : locale?.MENU?.DARK_MODE || 'Dark mode'

  /**
   * 对外暴露方法
   */
  useImperativeHandle(cRef, () => {
    return {
      handleChangeDarkMode: () => {
        handleChangeDarkMode()
      }
    }
  })

  // 用户手动设置主题
  const handleChangeDarkMode = () => {
    const newStatus = !isDarkMode
    saveDarkModeToLocalStorage(newStatus)
    updateDarkMode(newStatus)
    const htmlElement = document.getElementsByTagName('html')[0]
    htmlElement.classList?.remove(newStatus ? 'light' : 'dark')
    htmlElement.classList?.add(newStatus ? 'dark' : 'light')
  }

  return (
    <button
      type='button'
      onClick={handleChangeDarkMode}
      aria-label={label}
      title={label}
      className={`${className || ''} cursor-pointer hover:bg-black hover:bg-opacity-10 rounded-full w-10 h-10 flex justify-center items-center duration-200 transition-all`}>
      <span id='darkModeButton' aria-hidden='true'>
        {' '}
        {isDarkMode ? (
          <Sun className='w-5 h-5' />
        ) : (
          <Moon className='w-5 h-5' />
        )}
      </span>
    </button>
  )
}
export default DarkModeButton
