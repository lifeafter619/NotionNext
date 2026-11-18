/**
 * @jest-environment node
 */

import { adjustPageProperties } from '@/lib/db/notion/getPageProperties'

jest.mock('notion-utils', () => ({
  getDateValue: jest.fn(),
  getTextContent: jest.fn()
}))

jest.mock('@/lib/db/notion/getNotionAPI', () => ({
  __esModule: true,
  default: {
    getUsers: jest.fn()
  }
}))

describe('adjustPageProperties', () => {
  it.each([
    ['Page', undefined, '/manual/a-manual'],
    ['Page', { start_date: '2026-08-01' }, '/manual/2026/08/01/a-manual'],
    ['Post', undefined, '/manual/2026/08/01/a-manual']
  ])(
    'keeps explicit dates but excludes creation dates for %s pages',
    (type, date, href) => {
      const page = {
        id: 'page-id',
        type,
        slug: 'a-manual',
        category: 'Guide',
        date,
        publishDate: Date.UTC(2026, 7, 1),
        publishDay: '2026-08-01'
      }
      adjustPageProperties(page, {
        POST_URL_PREFIX: '%category%/%year%/%month%/%day%',
        POST_URL_PREFIX_MAPPING_CATEGORY: { Guide: 'manual' },
        PSEUDO_STATIC: false
      })
      expect(page.href).toBe(href)
      expect(page.publishDate).toBe(Date.UTC(2026, 7, 1))
    }
  )

  it('uses category mapping for pages only when the page category is mapped', () => {
    const NOTION_CONFIG = {
      POST_URL_PREFIX: '%category%/%year%/%month%/%day%',
      POST_URL_PREFIX_MAPPING_CATEGORY: {
        Guide: 'manual'
      },
      PSEUDO_STATIC: false
    }

    const mappedPage = {
      id: 'page-id',
      type: 'Page',
      slug: 'a-manual',
      category: 'Guide'
    }
    const plainPage = {
      id: 'plain-id',
      type: 'Page',
      slug: 'a-book',
      category: 'Book'
    }

    adjustPageProperties(mappedPage, NOTION_CONFIG)
    adjustPageProperties(plainPage, NOTION_CONFIG)

    expect(mappedPage.slug).toBe('manual/a-manual')
    expect(mappedPage.href).toBe('/manual/a-manual')
    expect(plainPage.slug).toBe('a-book')
    expect(plainPage.href).toBe('/a-book')
  })
})
