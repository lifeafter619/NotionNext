jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn(),
  getPostBlocks: jest.fn(async () => ({ block: {} }))
}))

jest.mock('@/themes/theme', () => ({
  DynamicLayout: () => null
}))

jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  formatNotionBlock: jest.fn(block => block)
}))

jest.mock('@/lib/utils/robots.txt', () => ({
  generateRobotsTxt: jest.fn()
}))

jest.mock('@/lib/utils/rss', () => ({
  generateRss: jest.fn(),
  shouldGenerateRssForLocale: jest.fn(() => false)
}))

jest.mock('@/lib/utils/sitemap.xml', () => ({
  generateSitemapXml: jest.fn()
}))

jest.mock('@/lib/utils/redirect', () => ({
  generateRedirectJson: jest.fn()
}))

jest.mock('@/lib/plugins/algolia', () => ({
  checkDataFromAlgolia: jest.fn()
}))

jest.mock('p-limit', () => jest.fn(() => fn => fn()))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    if (key === 'POST_LIST_STYLE') return 'page'
    if (key === 'POSTS_PER_PAGE') return 12
    if (key === 'POST_LIST_PREVIEW') return false
    return fallback
  })
}))

const { fetchGlobalAllData } = require('@/lib/db/SiteDataApi')
const { getStaticProps: getIndexStaticProps } = require('@/pages/index')
const { getStaticProps: getPageStaticProps } = require('@/pages/page/[page]')
const {
  getStaticProps: getCategoryStaticProps
} = require('@/pages/category/[category]')
const {
  getStaticProps: getCategoryPageStaticProps
} = require('@/pages/category/[category]/page/[page]')
const { getStaticProps: getTagStaticProps } = require('@/pages/tag/[tag]')
const {
  getStaticProps: getTagPageStaticProps
} = require('@/pages/tag/[tag]/page/[page]')

const sensitivePost = {
  id: 'post-1',
  type: 'Post',
  status: 'Published',
  title: 'Visible post',
  slug: 'article/visible',
  href: '/article/visible',
  summary: 'Summary',
  tags: ['tag-a'],
  category: 'cat-a',
  password: 'hashed-password',
  content: ['block1'],
  toc: [{ id: 'block1' }],
  blockMap: { block: { block1: { value: { id: 'block1' } } } }
}

function mockSiteData() {
  fetchGlobalAllData.mockResolvedValue({
    NOTION_CONFIG: {},
    allPages: [sensitivePost],
    postCount: 1
  })
}

function expectCleanListPost(post) {
  expect(post).toEqual(
    expect.objectContaining({
      id: 'post-1',
      title: 'Visible post',
      slug: 'article/visible'
    })
  )
  expect(post.password).toBeUndefined()
  expect(post.content).toBeUndefined()
  expect(post.toc).toBeUndefined()
  expect(post.blockMap).toBeUndefined()
}

describe('list page props', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSiteData()
  })

  it('cleans home page post list props', async () => {
    const result = await getIndexStaticProps({ locale: 'zh-CN' })

    expectCleanListPost(result.props.posts[0])
    expect(result.props.allPages).toBeUndefined()
  })

  it('cleans numbered page post list props', async () => {
    const result = await getPageStaticProps({
      params: { page: '1' },
      locale: 'zh-CN'
    })

    expectCleanListPost(result.props.posts[0])
    expect(result.props.allPages).toBeUndefined()
  })

  it('cleans category post list props', async () => {
    const result = await getCategoryStaticProps({
      params: { category: 'cat-a' },
      locale: 'zh-CN'
    })

    expectCleanListPost(result.props.posts[0])
    expect(result.props.allPages).toBeUndefined()
  })

  it('cleans category page post list props', async () => {
    const result = await getCategoryPageStaticProps({
      params: { category: 'cat-a', page: '1' },
      locale: 'zh-CN'
    })

    expectCleanListPost(result.props.posts[0])
    expect(result.props.allPages).toBeUndefined()
  })

  it('cleans tag post list props', async () => {
    const result = await getTagStaticProps({
      params: { tag: 'tag-a' },
      locale: 'zh-CN'
    })

    expectCleanListPost(result.props.posts[0])
    expect(result.props.allPages).toBeUndefined()
  })

  it('cleans tag page post list props', async () => {
    const result = await getTagPageStaticProps({
      params: { tag: 'tag-a', page: '1' },
      locale: 'zh-CN'
    })

    expectCleanListPost(result.props.posts[0])
    expect(result.props.allPages).toBeUndefined()
  })
})
