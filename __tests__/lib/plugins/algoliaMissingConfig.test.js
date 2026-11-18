const algoliasearchMock = jest.fn(() => ({
  initIndex: jest.fn(() => ({}))
}))

jest.mock('algoliasearch', () => algoliasearchMock)

jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: {
    ALGOLIA_APP_ID: 'app-id',
    ALGOLIA_ADMIN_APP_KEY: null,
    ALGOLIA_INDEX: null
  }
}))

describe('algolia plugin missing admin configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not initialize Algolia on module import without complete admin configuration', async () => {
    await import('@/lib/plugins/algolia')

    expect(algoliasearchMock).not.toHaveBeenCalled()
  })

  it('skips overwriting the search index without complete admin configuration', async () => {
    const { overwriteAlgoliaSearch } = await import('@/lib/plugins/algolia')

    await overwriteAlgoliaSearch([
      {
        id: 'post-1',
        slug: 'post-1',
        status: 'Published',
        title: 'Post 1',
        type: 'Post',
        content: 'searchable content'
      }
    ])

    expect(algoliasearchMock).not.toHaveBeenCalled()
  })

  it('skips deleting stale records without complete admin configuration', async () => {
    const { checkDataFromAlgolia } = await import('@/lib/plugins/algolia')

    await checkDataFromAlgolia({
      allPages: [
        {
          id: 'post-1',
          slug: 'post-1',
          status: 'Draft',
          title: 'Post 1',
          type: 'Post'
        }
      ]
    })

    expect(algoliasearchMock).not.toHaveBeenCalled()
  })
})
