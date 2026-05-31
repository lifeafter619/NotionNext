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

  it('sanitizes global post lists even when site data comes from cache', async () => {
    const postId = '12345678-1234-1234-1234-123456789abc'
    const cachedPost = {
      id: postId,
      title: 'Post',
      type: 'Post',
      status: 'Published',
      slug: 'article/post',
      href: '/article/post',
      summary: 'Summary',
      category: 'Category',
      tags: ['tag'],
      password: 'hashed-password',
      content: ['block-1'],
      toc: [{ id: 'block-1' }],
      blockMap: {
        block: {
          'block-1': { value: { id: 'block-1' } }
        }
      }
    }
    getOrSetDataWithCache.mockResolvedValue({
      NOTION_CONFIG: {},
      siteInfo: {},
      notice: null,
      allPages: [cachedPost],
      allMembers: [],
      allEvents: [],
      allNavPages: [cachedPost],
      latestPosts: [cachedPost],
      tagOptions: [{ name: 'tag' }],
      categoryOptions: [],
      customNav: [],
      customMenu: [],
      postCount: 1
    })

    const result = await fetchGlobalAllData({
      pageId: 'test-page',
      from: 'unit-test',
      locale: 'zh-CN'
    })

    for (const post of [result.allPages[0], result.latestPosts[0]]) {
      expect(post).toEqual(
        expect.objectContaining({
          id: postId,
          title: 'Post',
          slug: 'article/post',
          href: '/article/post'
        })
      )
      expect(post.password).toBeUndefined()
      expect(post.content).toBeUndefined()
      expect(post.toc).toBeUndefined()
      expect(post.blockMap).toBeUndefined()
    }

    expect(result.allNavPages[0]).toEqual(
      expect.objectContaining({
        short_id: postId.substring(14),
        title: 'Post',
        slug: 'article/post',
        href: '/article/post'
      })
    )
    expect(result.allNavPages[0].id).toBeUndefined()
    expect(result.allNavPages[0].password).toBeUndefined()
    expect(result.allNavPages[0].content).toBeUndefined()
    expect(result.allNavPages[0].toc).toBeUndefined()
    expect(result.allNavPages[0].blockMap).toBeUndefined()
  })
})
