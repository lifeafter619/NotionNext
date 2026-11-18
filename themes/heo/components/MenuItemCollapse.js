import Collapse from '@/components/Collapse'
import SmartLink from './HeoLink'
import { useId, useState } from 'react'

/**
 * 折叠菜单
 * @param {*} param0
 * @returns
 */
export const MenuItemCollapse = ({ link }) => {
  const subMenus = Array.isArray(link?.subMenus)
    ? link.subMenus.filter(item => item?.show !== false && item?.href)
    : []
  const hasSubMenu = subMenus.length > 0
  const menuId = useId()

  const [isOpen, changeIsOpen] = useState(false)

  const toggleOpenSubMenu = () => {
    changeIsOpen(!isOpen)
  }

  if (!link || !link.show) {
    return null
  }

  return (
    <>
      <div className='select-none w-full p-2 border dark:border-gray-600 rounded-lg text-left dark:bg-[var(--heo-color-card-dark)]'>
        {!hasSubMenu && (
          <SmartLink
            href={link?.href || '#'}
            target={link?.target}
            className='font-extralight  flex justify-between pl-2 pr-4 dark:text-gray-200 no-underline tracking-widest'>
            <span className=' transition-all items-center duration-200'>
              {link?.icon && <i className={link.icon + ' mr-4'} />}
              {link?.name}
            </span>
          </SmartLink>
        )}
        {hasSubMenu && (
          <button
            type='button'
            aria-expanded={isOpen}
            aria-controls={menuId}
            onClick={toggleOpenSubMenu}
            className='font-extralight flex w-full items-center justify-between pl-2 pr-4 cursor-pointer dark:text-gray-200 no-underline tracking-widest'>
            <span className='transition-all items-center duration-200'>
              {link?.icon && <i className={link.icon + ' mr-4'} />}
              {link?.name}
            </span>
            <i
              className={`select-none px-2 fas fa-chevron-left transition-all duration-200 ${isOpen ? '-rotate-90' : ''} text-gray-400`}></i>
          </button>
        )}
      </div>

      {/* 折叠子菜单 */}
      {hasSubMenu && (
        <Collapse isOpen={isOpen} className='rounded-xl'>
          <div id={menuId} aria-hidden={!isOpen}>
            {subMenus.map((sLink, index) => (
              <div
                key={sLink.id || sLink.href || index}
                className='dark:bg-hexo-black-gray dark:text-gray-200 text-left px-3 justify-start bg-gray-50 hover:bg-gray-50 dark:hover:bg-gray-900 tracking-widest transition-all duration-200 py-3 pr-6'>
                <SmartLink
                  href={sLink.href}
                  tabIndex={isOpen ? 0 : -1}
                  target={sLink?.target || link?.target}>
                  <span className='text-sm ml-4 whitespace-nowrap'>
                    {sLink?.icon && <i className={sLink.icon + ' mr-2'} />}{' '}
                    {sLink.title || sLink.name}
                  </span>
                </SmartLink>
              </div>
            ))}
          </div>
        </Collapse>
      )}
    </>
  )
}
