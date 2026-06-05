jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn(),
  cleanPostSummaries: jest.fn(posts =>
    Array.isArray(posts)
      ? posts.map(post => ({
          title: post.title,
          href: post.href,
          pageCoverThumbnail: post.pageCoverThumbnail
        }))
      : posts
  )
}))

jest.mock('@/themes/theme', () => ({
  DynamicLayout: () => null
}))

const {
  cleanPostSummaries,
  fetchGlobalAllData
} = require('@/lib/db/SiteDataApi')
const { getStaticProps } = require('@/pages/404')

describe('404 page props', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not send full post indexes to the client', async () => {
    const latestPosts = [
      {
        id: 'post-1',
        title: 'Post',
        href: '/article/post',
        pageCoverThumbnail: '/cover.jpg',
        content: 'server-only body'
      }
    ]

    fetchGlobalAllData.mockResolvedValue({
      NOTION_CONFIG: {},
      siteInfo: { title: 'Site' },
      allPages: [{ id: 'post-1' }],
      allNavPages: [{ id: 'post-1' }],
      allLinkPages: [{ id: 'post-1' }],
      latestPosts
    })

    const result = await getStaticProps({ locale: 'zh-CN' })

    expect(fetchGlobalAllData).toHaveBeenCalledWith({
      from: '404',
      locale: 'zh-CN'
    })
    expect(cleanPostSummaries).toHaveBeenCalledWith(latestPosts)
    expect(result.props.allPages).toBeUndefined()
    expect(result.props.allNavPages).toBeUndefined()
    expect(result.props.allLinkPages).toBeUndefined()
    expect(result.props.latestPosts).toEqual([
      {
        title: 'Post',
        href: '/article/post',
        pageCoverThumbnail: '/cover.jpg'
      }
    ])
  })
})
