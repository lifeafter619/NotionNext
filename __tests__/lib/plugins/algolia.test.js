const replaceAllWaitMock = jest.fn()
const replaceAllObjectsMock = jest.fn(() => ({
  wait: replaceAllWaitMock
}))
const clearObjectsWaitMock = jest.fn()
const clearObjectsMock = jest.fn(() => ({
  wait: clearObjectsWaitMock
}))
const saveObjectsWaitMock = jest.fn()
const saveObjectsMock = jest.fn(() => ({
  wait: saveObjectsWaitMock
}))

jest.mock('algoliasearch', () =>
  jest.fn(() => ({
    initIndex: jest.fn(() => ({
      replaceAllObjects: replaceAllObjectsMock,
      clearObjects: clearObjectsMock,
      saveObjects: saveObjectsMock
    }))
  }))
)

jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: {
    ALGOLIA_APP_ID: 'app-id',
    ALGOLIA_ADMIN_APP_KEY: 'admin-key',
    ALGOLIA_INDEX: 'search-index'
  }
}))

describe('overwriteAlgoliaSearch', () => {
  const originalLifecycleEvent = process.env.npm_lifecycle_event

  beforeEach(() => {
    jest.clearAllMocks()
    replaceAllWaitMock.mockReset()
    clearObjectsWaitMock.mockReset()
    saveObjectsWaitMock.mockReset()
    process.env.npm_lifecycle_event = originalLifecycleEvent
  })

  afterAll(() => {
    process.env.npm_lifecycle_event = originalLifecycleEvent
  })

  it('rejects when Algolia fails to replace objects', async () => {
    const indexError = new Error('Algolia quota exceeded')
    replaceAllWaitMock.mockRejectedValue(indexError)
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const { overwriteAlgoliaSearch } = await import('@/lib/plugins/algolia')

    await expect(
      overwriteAlgoliaSearch([
        {
          id: 'post-1',
          slug: 'post-1',
          status: 'Published',
          title: 'Post 1',
          type: 'Post',
          content: 'searchable content'
        }
      ])
    ).rejects.toThrow('Algolia quota exceeded')
  })

  it('falls back to clearing and saving objects when Algolia temporary index quota is exceeded', async () => {
    const quotaError = new Error(
      'Too many indices (11>10), please remove unused indices before pushing more data.'
    )
    replaceAllWaitMock.mockRejectedValue(quotaError)
    clearObjectsWaitMock.mockResolvedValue()
    saveObjectsWaitMock.mockResolvedValue()
    jest.spyOn(console, 'warn').mockImplementation(() => {})

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

    expect(clearObjectsMock).toHaveBeenCalledTimes(1)
    expect(saveObjectsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        objectID: 'post-1-0',
        content: 'searchable content'
      })
    ])
  })

  it('does not fail production builds when Algolia credentials are rejected during fallback indexing', async () => {
    process.env.npm_lifecycle_event = 'build'
    const quotaError = new Error(
      'Too many indices (11>10), please remove unused indices before pushing more data.'
    )
    const credentialsError = Object.assign(
      new Error('Invalid Application-ID or API key'),
      { status: 403 }
    )
    replaceAllWaitMock.mockRejectedValue(quotaError)
    clearObjectsWaitMock.mockResolvedValue()
    saveObjectsWaitMock.mockRejectedValue(credentialsError)
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    const { overwriteAlgoliaSearch } = await import('@/lib/plugins/algolia')

    await expect(
      overwriteAlgoliaSearch([
        {
          id: 'post-1',
          slug: 'post-1',
          status: 'Published',
          title: 'Post 1',
          type: 'Post',
          content: 'searchable content'
        }
      ])
    ).resolves.toBeUndefined()
  })

  it('does not fail production builds when Algolia credentials are rejected during replacement indexing', async () => {
    process.env.npm_lifecycle_event = 'build'
    const credentialsError = Object.assign(
      new Error('Invalid Application-ID or API key'),
      { status: 403 }
    )
    replaceAllWaitMock.mockRejectedValue(credentialsError)
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    const { overwriteAlgoliaSearch } = await import('@/lib/plugins/algolia')

    await expect(
      overwriteAlgoliaSearch([
        {
          id: 'post-1',
          slug: 'post-1',
          status: 'Published',
          title: 'Post 1',
          type: 'Post',
          content: 'searchable content'
        }
      ])
    ).resolves.toBeUndefined()
  })
})
