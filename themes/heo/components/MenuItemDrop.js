import SmartLink from './HeoLink'
import { useId, useRef, useState } from 'react'

export const MenuItemDrop = ({ link }) => {
  const [show, changeShow] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const menuId = useId()
  const subMenus = Array.isArray(link?.subMenus)
    ? link.subMenus.filter(item => item?.show !== false && item?.href)
    : []
  const hasSubMenu = subMenus.length > 0

  if (!link || !link.show) {
    return null
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => changeShow(true)}
      onMouseLeave={() => changeShow(false)}
      onFocus={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          changeShow(true)
        }
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          changeShow(false)
        }
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && show) {
          event.preventDefault()
          event.stopPropagation()
          changeShow(false)
          triggerRef.current?.focus()
        }
      }}>
      {/* 不含子菜单 */}
      {!hasSubMenu && (
        <SmartLink
          target={link?.target}
          href={link?.href || '#'}
          className=' hover:bg-black hover:bg-opacity-10 rounded-2xl flex justify-center items-center px-3 py-1 no-underline tracking-widest'>
          {link?.icon && <i className={link?.icon} />} {link?.name}
        </SmartLink>
      )}
      {/* 含子菜单的按钮 */}
      {hasSubMenu && (
        <>
          <button
            ref={triggerRef}
            type='button'
            aria-expanded={show}
            aria-controls={menuId}
            aria-haspopup='menu'
            onClick={() => changeShow(current => !current)}
            className='cursor-pointer hover:bg-black hover:bg-opacity-10 rounded-2xl flex justify-center items-center px-3 py-1 no-underline tracking-widest relative'>
            {link?.icon && <i className={link?.icon} />} {link?.name}
            {/* 主菜单下方的安全区域 */}
            {show && (
              <span
                aria-hidden='true'
                className='absolute w-full h-4 -bottom-4 left-0 bg-transparent z-30'
              />
            )}
          </button>
        </>
      )}
      {/* 子菜单 */}
      {hasSubMenu && (
        <ul
          id={menuId}
          role='menu'
          aria-hidden={!show}
          style={{ backdropFilter: 'blur(3px)' }}
          className={`${show ? 'visible opacity-100 top-14 pointer-events-auto' : 'invisible opacity-0 top-20 pointer-events-none'} drop-shadow-md overflow-hidden rounded-xl bg-white dark:bg-[#1e1e1e] transition-all duration-300 z-20 absolute`}>
          {subMenus.map((sLink, index) => {
            return (
              <li
                key={sLink.id || sLink.href || index}
                className='cursor-pointer hover:bg-blue-600 dark:hover:bg-yellow-600 hover:text-white text-gray-900 dark:text-gray-100  tracking-widest transition-all duration-200 py-1 pr-6 pl-3'>
                <SmartLink
                  href={sLink.href}
                  role='menuitem'
                  target={sLink?.target || link?.target}>
                  <span className='text-sm text-nowrap font-extralight'>
                    {sLink?.icon && <i className={sLink.icon}> &nbsp; </i>}
                    {sLink.title || sLink.name}
                  </span>
                </SmartLink>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
