jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn()
}))

jest.mock('@/themes/theme', () => ({
  DynamicLayout: () => null
}))

const { fetchGlobalAllData } = require('@/lib/db/SiteDataApi')
const { getStaticProps } = require('@/pages/archive')

describe('archive page props', () => {
  it('does not send duplicate flat posts when archivePosts is already available', async () => {
    fetchGlobalAllData.mockResolvedValue({
      NOTION_CONFIG: {},
      allPages: [
        {
          id: 'post-1',
          type: 'Post',
          status: 'Published',
          slug: 'article/a',
          title: 'A',
          publishDate: Date.UTC(2026, 0, 1),
          summary: undefined,
          password: undefined,
          tags: undefined,
          category: undefined,
          pageCover: undefined,
          pageCoverThumbnail: undefined
        }
      ]
    })

    const result = await getStaticProps({ locale: 'zh-CN' })

    expect(result.props.archivePosts).toEqual({
      '2026-01': [expect.objectContaining({ id: 'post-1', title: 'A' })]
    })
    expect(result.props.posts).toBeUndefined()
  })
})
