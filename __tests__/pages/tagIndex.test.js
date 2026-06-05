jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn()
}))

jest.mock('@/themes/theme', () => ({
  DynamicLayout: () => null
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => fallback)
}))

const { fetchGlobalAllData } = require('@/lib/db/SiteDataApi')
const {
  getStaticProps,
  getTagPreviewPostsByTag
} = require('@/pages/tag')

describe('tag index page props', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('builds slim preview posts for each tag', () => {
    const result = getTagPreviewPostsByTag({
      tagOptions: [{ name: 'React' }, { name: 'UX' }],
      allPages: [
        {
          id: 'post-1',
          type: 'Post',
          status: 'Published',
          tags: ['React', 'UX'],
          title: 'React UX',
          href: '/article/react-ux',
          summary: 'Summary',
          createdTime: 1,
          category: 'Design',
          pageCoverThumbnail: '/cover.jpg',
          content: 'server-only body',
          blockMap: { block: {} }
        },
        {
          id: 'draft-1',
          type: 'Post',
          status: 'Draft',
          tags: ['React'],
          title: 'Draft'
        },
        {
          id: 'page-1',
          type: 'Page',
          status: 'Published',
          tags: ['React'],
          title: 'Page'
        }
      ]
    })

    expect(result.React).toEqual([
      {
        id: 'post-1',
        title: 'React UX',
        href: '/article/react-ux',
        summary: 'Summary',
        createdTime: 1,
        category: 'Design',
        pageCoverThumbnail: '/cover.jpg'
      }
    ])
    expect(result.React[0].content).toBeUndefined()
    expect(result.React[0].blockMap).toBeUndefined()
    expect(result.UX).toHaveLength(1)
  })

  it('does not send the full allPages index to the tag landing page', async () => {
    fetchGlobalAllData.mockResolvedValue({
      NOTION_CONFIG: {},
      allPages: [
        {
          id: 'post-1',
          type: 'Post',
          status: 'Published',
          tags: ['React'],
          title: 'React UX',
          href: '/article/react-ux'
        }
      ],
      tagOptions: [{ name: 'React' }]
    })

    const result = await getStaticProps({ locale: 'zh-CN' })

    expect(fetchGlobalAllData).toHaveBeenCalledWith({
      from: 'tag-index-props',
      locale: 'zh-CN'
    })
    expect(result.props.allPages).toBeUndefined()
    expect(result.props.tagPreviewPostsByTag.React).toEqual([
      {
        id: 'post-1',
        title: 'React UX',
        href: '/article/react-ux'
      }
    ])
  })
})
