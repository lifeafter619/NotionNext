import { generateRssContent } from '@/lib/utils/rssFeed'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

const addItem = jest.fn()

jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: {
    AUTHOR: 'Author',
    BIO: 'Bio',
    LANG: 'zh-CN',
    LINK: 'https://619.pp.ua',
    NOTION_PAGE_ID: 'site-id'
  }
}))

jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn()
}))

jest.mock('feed', () => ({
  Feed: jest.fn().mockImplementation(options => ({
    options,
    addItem,
    rss2: () => '<rss>ok</rss>',
    atom1: () => '<feed>ok</feed>',
    json1: () => '{"ok":true}'
  }))
}))

describe('runtime RSS feed generation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetchGlobalAllData.mockResolvedValue({
      siteInfo: {
        title: 'Site',
        description: 'Description',
        link: 'https://stale.example.com'
      },
      NOTION_CONFIG: {
        AUTHOR: 'Author',
        LANG: 'zh-CN'
      },
      allPages: [
        {
          id: 'post-1',
          type: 'Post',
          status: 'Published',
          slug: '/article/hello',
          title: 'Hello',
          summary: 'Summary',
          publishDate: Date.UTC(2026, 6, 25)
        }
      ]
    })
  })

  it('uses the configured page ID and canonical primary domain', async () => {
    const content = await generateRssContent()

    expect(fetchGlobalAllData).toHaveBeenCalledWith({
      from: 'rss-api',
      pageId: 'site-id',
      locale: 'zh-CN'
    })
    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        link: 'https://619.pp.ua/article/hello',
        date: new Date(Date.UTC(2026, 6, 25))
      })
    )
    expect(content).toEqual({
      xml: '<rss>ok</rss>',
      atomXml: '<feed>ok</feed>',
      json: '{"ok":true}'
    })
  })
})
