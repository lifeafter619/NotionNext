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
const { fetchNotionPageBlocks } = require('@/lib/db/notion/getPostBlocks')
const { processPostData } = require('@/lib/utils/post')
const {
  restoreCompactBlockMapForRender
} = require('@/lib/db/notion/cleanBlockMapForClient')
const { fetchGlobalAllData, resolvePostProps } = require('@/lib/db/SiteDataApi')

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

  it('does not warn when legacy cached site data omits optional lists', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    getOrSetDataWithCache.mockResolvedValue({
      NOTION_CONFIG: {},
      siteInfo: {},
      notice: null,
      allPages: [],
      allNavPages: [],
      latestPosts: [],
      tagOptions: [],
      categoryOptions: [],
      customNav: [],
      customMenu: [],
      postCount: 0
    })

    await fetchGlobalAllData({
      pageId: 'test-page',
      from: 'unit-test',
      locale: 'zh-CN'
    })

    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
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

  it('prunes parent collection records from article block maps before returning props', async () => {
    const postId = '12345678-1234-1234-1234-123456789abc'
    getOrSetDataWithCache.mockResolvedValue({
      NOTION_CONFIG: {},
      siteInfo: {},
      notice: null,
      allPages: [
        {
          id: postId,
          title: 'Post',
          type: 'Post',
          status: 'Published',
          slug: 'article/post',
          href: '/article/post'
        }
      ],
      allMembers: [],
      allEvents: [],
      allNavPages: [],
      latestPosts: [],
      tagOptions: [],
      categoryOptions: [],
      customNav: [],
      customMenu: [],
      postCount: 1
    })
    fetchNotionPageBlocks.mockResolvedValue({
      block: {
        [postId]: {
          value: {
            id: postId,
            type: 'page',
            parent_id: 'collection-1',
            content: ['child-1', 'ref-1']
          }
        },
        'child-1': {
          value: {
            id: 'child-1',
            type: 'text',
            parent_id: postId,
            properties: {
              title: [['Body']]
            }
          }
        },
        'ref-1': {
          value: {
            id: 'ref-1',
            type: 'transclusion_reference',
            parent_id: postId,
            format: {
              transclusion_reference_pointer: {
                id: 'source-1'
              }
            }
          }
        },
        'source-1': {
          value: {
            id: 'source-1',
            type: 'transclusion_container',
            parent_id: 'other-page',
            content: ['synced-child']
          }
        },
        'synced-child': {
          value: {
            id: 'synced-child',
            type: 'text',
            parent_id: 'source-1',
            properties: {
              title: [['Synced body']]
            }
          }
        },
        'collection-page': {
          value: {
            id: 'collection-page',
            type: 'collection_view_page',
            parent_id: 'workspace',
            collection_id: 'collection-1',
            view_ids: ['view-1']
          }
        }
      },
      collection: {
        'collection-1': {
          value: {
            id: 'collection-1',
            schema: {
              title: { name: 'Name' }
            }
          }
        }
      },
      collection_view: {
        'view-1': {
          value: {
            id: 'view-1',
            type: 'table'
          }
        }
      },
      collection_query: {
        'collection-1': {
          'view-1': {
            collection_group_results: {
              blockIds: ['irrelevant']
            }
          }
        }
      }
    })

    const result = await resolvePostProps({
      prefix: 'article',
      slug: 'post',
      locale: 'zh-CN'
    })

    expect(result.post.blockMap.__compact_block_ids).toEqual([
      postId,
      'child-1',
      'ref-1',
      'source-1',
      'synced-child'
    ])
    expect(result.post.blockMap.block[postId]).toBeUndefined()

    const restoredBlockMap = restoreCompactBlockMapForRender(
      result.post.blockMap
    )

    expect(restoredBlockMap.block[postId]).toBeDefined()
    expect(restoredBlockMap.block['child-1']).toBeDefined()
    expect(restoredBlockMap.block['ref-1']).toBeDefined()
    expect(restoredBlockMap.block['source-1']).toBeDefined()
    expect(restoredBlockMap.block['synced-child']).toBeDefined()
    expect(restoredBlockMap.block['collection-page']).toBeUndefined()
    expect(restoredBlockMap.collection).toBeUndefined()
    expect(restoredBlockMap.collection_view).toBeUndefined()
    expect(restoredBlockMap.collection_query).toBeUndefined()
  })

  it('trims article page lists to fields needed by detail layout', async () => {
    const postId = '12345678-1234-1234-1234-123456789abc'
    const heavyCover =
      'https://www.notion.so/image/attachment%3Acover.png?table=block&id=12345678-1234-1234-1234-123456789abc&width=1080&cache=v2'
    const navPost = {
      id: '22345678-1234-1234-1234-123456789abc',
      short_id: '1234-1234-123456789abc',
      title: 'Nav Post',
      slug: 'article/nav-post',
      href: '/article/nav-post',
      summary: 'Summary that is useful on list pages but not detail nav.',
      category: 'Category',
      tags: ['tag'],
      pageIcon: 'N',
      pageCoverThumbnail: heavyCover,
      lastEditedDate: '2026-01-01T00:00:00.000Z',
      publishDate: 1767225600000,
      ext: {
        rank: 10
      }
    }
    getOrSetDataWithCache.mockResolvedValue({
      NOTION_CONFIG: {},
      siteInfo: {},
      notice: null,
      allPages: [
        {
          id: postId,
          title: 'Post',
          type: 'Post',
          status: 'Published',
          slug: 'article/post',
          href: '/article/post'
        }
      ],
      allMembers: [],
      allEvents: [],
      allNavPages: [navPost],
      allLinkPages: [navPost],
      latestPosts: [navPost],
      tagOptions: [{ name: 'tag' }],
      categoryOptions: [],
      customNav: [],
      customMenu: [],
      postCount: 1
    })
    fetchNotionPageBlocks.mockResolvedValue({
      block: {
        [postId]: {
          value: {
            id: postId,
            type: 'page',
            parent_id: 'workspace',
            content: []
          }
        }
      }
    })
    processPostData.mockImplementationOnce(props => {
      props.prev = navPost
      props.next = navPost
      props.recommendPosts = [navPost]
    })

    const result = await resolvePostProps({
      prefix: 'article',
      slug: 'post',
      locale: 'zh-CN'
    })

    expect(result.allNavPages).toEqual([
      {
        title: 'Nav Post',
        slug: 'article/nav-post',
        href: '/article/nav-post',
        tags: ['tag'],
        lastEditedDate: '2026-01-01T00:00:00.000Z',
        short_id: '1234-1234-123456789abc'
      }
    ])
    expect(result.allLinkPages).toEqual([
      {
        title: 'Nav Post',
        slug: 'article/nav-post',
        href: '/article/nav-post',
        short_id: '1234-1234-123456789abc'
      }
    ])
    expect(result.latestPosts).toEqual([
      {
        title: 'Nav Post',
        slug: 'article/nav-post',
        href: '/article/nav-post'
      }
    ])
    expect(result.recommendPosts).toEqual([
      {
        id: '22345678-1234-1234-1234-123456789abc',
        title: 'Nav Post',
        href: '/article/nav-post',
        pageCoverThumbnail: heavyCover
      }
    ])
    expect(result.prev.pageCoverThumbnail).toBe(heavyCover)
    expect(result.next.pageCoverThumbnail).toBe(heavyCover)
  })
})
