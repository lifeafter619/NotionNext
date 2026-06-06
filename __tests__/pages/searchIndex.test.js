jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn()
}))

jest.mock('@/themes/theme', () => ({
  DynamicLayout: () => null
}))

jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  fetchNotionPageBlocks: jest.fn(async () => ({ block: {} }))
}))

jest.mock('@/lib/db/notion/getPageContentText', () => ({
  getPageContentText: jest.fn(() => '')
}))

jest.mock('@/lib/plugins/algolia', () => ({
  overwriteAlgoliaSearch: jest.fn()
}))

jest.mock('@/lib/plugins/algoliaConfig', () => ({
  hasAlgoliaAdminConfig: jest.fn(() => false)
}))

jest.mock('notion-utils', () => ({
  idToUuid: jest.fn(id => id)
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    if (key === 'THEME') return 'heo'
    return fallback
  })
}))

const { fetchGlobalAllData } = require('@/lib/db/SiteDataApi')
const { fetchNotionPageBlocks } = require('@/lib/db/notion/getPostBlocks')
const { getPageContentText } = require('@/lib/db/notion/getPageContentText')
const { getStaticProps } = require('@/pages/search')

describe('search index page props', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    console.warn.mockRestore()
    console.error.mockRestore()
  })

  it('does not warn for published pages with no body blocks', async () => {
    fetchGlobalAllData.mockResolvedValue({
      NOTION_CONFIG: {},
      allPages: [
        {
          id: 'empty-page',
          type: 'Page',
          status: 'Published',
          title: 'Empty page',
          slug: 'empty-page',
          summary: '',
          tags: [],
          category: ''
        }
      ]
    })
    fetchNotionPageBlocks.mockResolvedValueOnce({
      block: {
        'empty-page': {
          value: {
            id: 'empty-page',
            type: 'page',
            content: []
          }
        }
      }
    })

    const result = await getStaticProps({ locale: 'zh-CN' })

    expect(result.props.posts).toHaveLength(1)
    expect(result.props.posts[0]).toEqual(
      expect.objectContaining({
        id: 'empty-page',
        content: null
      })
    )
    expect(console.warn).not.toHaveBeenCalledWith(
      'Search index: content is empty for',
      'empty-page'
    )
  })

  it('does not expose cached content from password protected posts', async () => {
    fetchGlobalAllData.mockResolvedValue({
      NOTION_CONFIG: {},
      allPages: [
        {
          id: 'protected-post',
          type: 'Post',
          status: 'Published',
          title: 'Protected post',
          slug: 'protected-post',
          summary: 'Public summary',
          password: 'hashed-password',
          content: 'private body from cached props',
          blockMap: {
            rawText: 'private body from raw text'
          },
          tags: [],
          category: ''
        }
      ]
    })

    const result = await getStaticProps({ locale: 'zh-CN' })

    expect(result.props.posts).toHaveLength(1)
    expect(result.props.posts[0].password).toBeUndefined()
    expect(result.props.posts[0].content).toBeNull()
    expect(result.props.posts[0].blockMap).toBeUndefined()
    expect(fetchNotionPageBlocks).not.toHaveBeenCalled()
    expect(getPageContentText).not.toHaveBeenCalled()
  })

  it('keeps href in the client search payload for result links', async () => {
    fetchGlobalAllData.mockResolvedValue({
      NOTION_CONFIG: {},
      allPages: [
        {
          id: 'post-with-href',
          type: 'Post',
          status: 'Published',
          title: 'Searchable post',
          slug: 'article/searchable-post',
          href: '/article/searchable-post',
          summary: 'Public summary',
          tags: [],
          category: ''
        }
      ]
    })

    const result = await getStaticProps({ locale: 'zh-CN' })

    expect(result.props.posts[0]).toEqual(
      expect.objectContaining({
        slug: 'article/searchable-post',
        href: '/article/searchable-post'
      })
    )
  })
})
