jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn()
}))

jest.mock('@/themes/theme', () => ({
  DynamicLayout: () => null
}))

jest.mock('@/lib/cache/cache_manager', () => ({
  getDataFromCache: jest.fn(async () => ({ block: {} }))
}))

jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  fetchNotionPageBlocks: jest.fn(async () => ({ block: {} }))
}))

jest.mock('@/lib/db/notion/getPageContentText', () => ({
  getPageContentText: jest.fn(() => '')
}))

jest.mock('notion-utils', () => ({
  idToUuid: jest.fn(id => id)
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    if (key === 'POST_LIST_STYLE') return 'page'
    if (key === 'POSTS_PER_PAGE') return 12
    return fallback
  })
}))

const { fetchGlobalAllData } = require('@/lib/db/SiteDataApi')
const { getDataFromCache } = require('@/lib/cache/cache_manager')
const { getStaticProps } = require('@/pages/search/[keyword]')
const {
  getStaticProps: getSearchPageStaticProps
} = require('@/pages/search/[keyword]/page/[page]')

describe('search keyword page props', () => {
  it('does not send allPages or password hashes to the browser', async () => {
    fetchGlobalAllData.mockResolvedValue({
      NOTION_CONFIG: {},
      allPages: [
        {
          id: 'post-1',
          type: 'Post',
          status: 'Published',
          title: 'Needle title',
          summary: 'Summary',
          slug: 'article/needle',
          href: '/article/needle',
          tags: [],
          category: '',
          password: 'hashed-password'
        },
        {
          id: 'post-2',
          type: 'Post',
          status: 'Published',
          title: 'Other',
          summary: 'Summary',
          slug: 'article/other',
          href: '/article/other',
          tags: [],
          category: '',
          password: ''
        }
      ]
    })

    const result = await getStaticProps({
      params: { keyword: 'Needle' },
      locale: 'zh-CN'
    })

    expect(result.props.allPages).toBeUndefined()
    expect(result.props.posts).toHaveLength(1)
    expect(result.props.posts[0]).toEqual(
      expect.objectContaining({
        id: 'post-1',
        title: 'Needle title',
        slug: 'article/needle'
      })
    )
    expect(result.props.posts[0].password).toBeUndefined()
  })

  it('cleans paginated search results and keeps body snippets', async () => {
    fetchGlobalAllData.mockResolvedValue({
      NOTION_CONFIG: {},
      allPages: [
        {
          id: 'post-1',
          type: 'Post',
          status: 'Published',
          title: 'Unrelated title',
          summary: 'Summary',
          slug: 'article/needle',
          href: '/article/needle',
          tags: [],
          category: '',
          password: ''
        }
      ]
    })
    getDataFromCache.mockResolvedValueOnce({
      block: {
        block1: {
          value: {
            properties: {
              title: [['Body has needle match']]
            }
          }
        }
      }
    })

    const result = await getSearchPageStaticProps({
      params: { keyword: 'needle', page: '1' },
      locale: 'zh-CN'
    })

    expect(result.props.allPages).toBeUndefined()
    expect(result.props.posts).toHaveLength(1)
    expect(result.props.posts[0].password).toBeUndefined()
    expect(result.props.posts[0].results).toEqual(
      expect.arrayContaining([expect.stringMatching(/needle/i)])
    )
  })

  it('does not search protected post body content on paginated search', async () => {
    fetchGlobalAllData.mockResolvedValue({
      NOTION_CONFIG: {},
      allPages: [
        {
          id: 'protected-post',
          type: 'Post',
          status: 'Published',
          title: 'Protected title',
          summary: 'Public summary',
          slug: 'article/protected',
          href: '/article/protected',
          tags: [],
          category: '',
          password: 'hashed-password'
        }
      ]
    })
    getDataFromCache.mockResolvedValueOnce({
      block: {
        block1: {
          value: {
            properties: {
              title: [['private needle body']]
            }
          }
        }
      }
    })

    const result = await getSearchPageStaticProps({
      params: { keyword: 'needle', page: '1' },
      locale: 'zh-CN'
    })

    expect(result.props.posts).toHaveLength(0)
  })
})
