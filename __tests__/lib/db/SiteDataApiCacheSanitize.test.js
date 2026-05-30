jest.mock('@/lib/cache/cache_manager', () => ({
  getOrSetDataWithCache: jest.fn()
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => fallback)
}))

jest.mock('notion-utils', () => ({
  idToUuid: jest.fn(id => id)
}))

jest.mock('@/lib/db/notion/getAllCategories', () => ({
  getAllCategories: jest.fn(() => [])
}))

jest.mock('@/lib/db/notion/getAllPageIds', () => jest.fn(() => []))

jest.mock('@/lib/db/notion/getAllTags', () => ({
  getAllTags: jest.fn(() => [])
}))

jest.mock('@/lib/db/notion/getNotionConfig', () => ({
  getConfigMapFromConfigPage: jest.fn(() => ({}))
}))

jest.mock('@/lib/db/notion/getPageProperties', () => ({
  __esModule: true,
  default: jest.fn(),
  adjustPageProperties: jest.fn()
}))

jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  fetchInBatches: jest.fn(() => ({})),
  fetchNotionPageBlocks: jest.fn(() => ({})),
  formatNotionBlock: jest.fn(block => block)
}))

jest.mock('@/lib/db/notion/mapImage', () => ({
  compressImage: jest.fn(),
  mapImgUrl: jest.fn()
}))

jest.mock('@/lib/db/notion/normalizeUtil', () => ({
  normalizeNotionMetadata: jest.fn(() => ({ type: 'collection_view_page' })),
  normalizeCollection: jest.fn(() => ({})),
  normalizeSchema: jest.fn(() => ({})),
  normalizePageBlock: jest.fn(() => null)
}))

jest.mock('@/lib/db/notion/getNotionPost', () => ({
  fetchPageFromNotion: jest.fn()
}))

jest.mock('@/lib/utils/post', () => ({
  processPostData: jest.fn()
}))

jest.mock('@/lib/utils/notion.util', () => ({
  adapterNotionBlockMap: jest.fn(blockMap => blockMap)
}))

jest.mock('@/lib/utils/pinnedPosts', () => ({
  sortPinnedPostsByLatestUpdate: jest.fn(pages => pages)
}))

jest.mock('@/lib/db/notion/memberDataSource', () => ({
  fetchMembersFromOfficialAPI: jest.fn(() => [])
}))

const { getOrSetDataWithCache } = require('@/lib/cache/cache_manager')
const { fetchGlobalAllData } = require('@/lib/db/SiteDataApi')

describe('fetchGlobalAllData cache sanitization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sanitizes customMenu even when global site data comes from cache', async () => {
    getOrSetDataWithCache.mockResolvedValue({
      NOTION_CONFIG: {},
      siteInfo: {},
      notice: null,
      allPages: [],
      allMembers: [],
      allEvents: [],
      allNavPages: [],
      latestPosts: [],
      tagOptions: [],
      categoryOptions: [],
      customNav: [],
      postCount: 0,
      customMenu: [
        {
          id: 'menu-1',
          name: 'Menu',
          title: 'Menu title',
          href: '/menu',
          show: true,
          status: 'Published',
          password: 'hashed-password',
          subMenus: [
            {
              id: 'submenu-1',
              name: 'Sub',
              title: 'Sub title',
              href: '/sub',
              show: true,
              password: 'nested-secret'
            }
          ]
        }
      ]
    })

    const result = await fetchGlobalAllData({
      pageId: 'test-page',
      from: 'unit-test',
      locale: 'zh-CN'
    })

    expect(result.customMenu).toEqual([
      {
        id: 'menu-1',
        name: 'Menu',
        title: 'Menu title',
        href: '/menu',
        show: true,
        subMenus: [
          {
            id: 'submenu-1',
            name: 'Sub',
            title: 'Sub title',
            href: '/sub',
            show: true
          }
        ]
      }
    ])
  })
})
