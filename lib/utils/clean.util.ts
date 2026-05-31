import { deepClone } from '@/lib/utils'

type WithOptionalId = object & { id?: unknown }
type MenuTree<T extends object> = T & {
  subMenus?: T[]
  children?: T[]
}

const CLIENT_MENU_FIELDS = [
  'id',
  'name',
  'title',
  'label',
  'icon',
  'href',
  'url',
  'target',
  'show',
  'slot'
] as const

export function cleanIds<T extends WithOptionalId>(items?: T[]): T[] {
  if (!Array.isArray(items)) return []
  return deepClone(items.map(({ id, ...item }) => item)) as T[]
}

export function cleanMenuItemsForClient<T extends object>(items?: T[]): T[] {
  if (!Array.isArray(items)) return []

  return items.map(item => {
    const source = item as Record<string, unknown> & MenuTree<T>
    const cleanedItem: Record<string, unknown> = {}

    CLIENT_MENU_FIELDS.forEach(field => {
      if (source[field] !== undefined) {
        cleanedItem[field] = source[field]
      }
    })

    if (Array.isArray(source.subMenus)) {
      cleanedItem.subMenus = cleanMenuItemsForClient(source.subMenus)
    }
    if (Array.isArray(source.children)) {
      cleanedItem.children = cleanMenuItemsForClient(source.children)
    }

    return cleanedItem as T
  })
}

export function cleanPages<T>(
  pages?: T[],
  tagOptions?: Array<Record<string, unknown>>
): T[] {
  if (!Array.isArray(pages)) return pages || []
  return pages
}

export function stripServerOnlyPostFields<T>(page: T): T {
  if (!page || typeof page !== 'object') return page

  const cleanedPage = { ...(page as Record<string, unknown>) }
  delete cleanedPage.password
  delete cleanedPage.content
  delete cleanedPage.toc
  delete cleanedPage.blockMap
  return cleanedPage as T
}

export function stripServerOnlyPostFieldsFromList<T>(pages?: T[]): T[] {
  if (!Array.isArray(pages)) return pages || []
  return pages.map(page => stripServerOnlyPostFields(page))
}

export function shortenIds<T>(items?: T[]): T[] | undefined {
  if (!Array.isArray(items)) return items
  return items
}
