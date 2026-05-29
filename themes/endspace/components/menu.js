import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import CONFIG from '../config'

export const buildMenuItems = ({ customNav, customMenu }) => {
  const defaultMenuItems = [
    { name: 'Home', path: '/' },
    {
      name: 'Category',
      path: '/category',
      show: siteConfig('ENDSPACE_MENU_CATEGORY', null, CONFIG)
    },
    {
      name: 'Tag',
      path: '/tag',
      show: siteConfig('ENDSPACE_MENU_TAG', null, CONFIG)
    },
    {
      name: 'Archive',
      path: '/archive',
      show: siteConfig('ENDSPACE_MENU_ARCHIVE', null, CONFIG)
    },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Friends', path: '/friends' },
    {
      name: 'Search',
      path: '/search',
      show: siteConfig('ENDSPACE_MENU_SEARCH', null, CONFIG)
    }
  ]

  const normalizeMenuItem = link => ({
    name: link?.name || link?.title || '',
    path: link?.href || link?.to || link?.slug || '/',
    target: link?.target,
    icon: link?.icon,
    show: link?.show,
    subMenus: Array.isArray(link?.subMenus)
      ? link.subMenus.map(normalizeMenuItem)
      : []
  })

  const customNavItems = Array.isArray(customNav)
    ? customNav.map(normalizeMenuItem)
    : []
  const customMenuItems = Array.isArray(customMenu)
    ? customMenu.map(normalizeMenuItem)
    : []

  let links =
    customNavItems.length > 0
      ? customNavItems.concat(defaultMenuItems)
      : defaultMenuItems

  if (siteConfig('CUSTOM_MENU', BLOG.CUSTOM_MENU) && customMenuItems.length > 0) {
    links = customMenuItems
  }

  return links.filter(item => item.show !== false)
}

export const isMenuItemActive = (item, currentPath) => {
  if (!item || !currentPath) return false
  const itemPath = item.path
  const selfActive =
    itemPath === '/' ? currentPath === '/' : itemPath && currentPath.startsWith(itemPath)

  if (selfActive) return true

  return item.subMenus?.some(subMenu => isMenuItemActive(subMenu, currentPath))
}
