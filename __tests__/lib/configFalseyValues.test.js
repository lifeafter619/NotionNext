const mockGetGlobalSnapshot = jest.fn()

jest.mock('@/lib/global', () => ({
  getGlobalSnapshot: mockGetGlobalSnapshot
}))

jest.mock('@/blog.config', () => ({
  BLOG_FALSE: false,
  BLOG_ZERO: 0,
  BLOG_EMPTY: '',
  BLOG_NULL: null,
  NEXT_REVALIDATE_SECOND: 'blog-special'
}))

const { siteConfig } = require('@/lib/config')

describe('siteConfig explicit falsey values', () => {
  beforeEach(() => {
    mockGetGlobalSnapshot.mockReturnValue({
      NOTION_CONFIG: {},
      THEME_CONFIG: {},
      siteInfo: {}
    })
  })

  test.each([
    ['false', false],
    ['zero', 0],
    ['empty string', '']
  ])('preserves Notion %s values ahead of lower-priority sources', (_, value) => {
    mockGetGlobalSnapshot.mockReturnValue({
      NOTION_CONFIG: { TEST_VALUE: value },
      THEME_CONFIG: { TEST_VALUE: 'theme' },
      siteInfo: {}
    })

    expect(
      siteConfig('TEST_VALUE', 'default', { TEST_VALUE: 'extended' })
    ).toBe(value)
  })

  test.each([null, undefined])(
    'treats only %p as absent in the Notion source',
    value => {
      mockGetGlobalSnapshot.mockReturnValue({
        NOTION_CONFIG: { TEST_VALUE: value },
        THEME_CONFIG: { TEST_VALUE: 'theme' },
        siteInfo: {}
      })

      expect(siteConfig('TEST_VALUE', 'default')).toBe('theme')
    }
  )

  test('falls through absent theme and extend values to BLOG and then the default', () => {
    mockGetGlobalSnapshot.mockReturnValue({
      NOTION_CONFIG: {},
      THEME_CONFIG: { BLOG_NULL: null },
      siteInfo: {}
    })

    expect(siteConfig('BLOG_NULL', 'default', { BLOG_NULL: undefined })).toBe(
      'default'
    )
  })

  test.each([
    ['BLOG_FALSE', false],
    ['BLOG_ZERO', 0],
    ['BLOG_EMPTY', '']
  ])('preserves explicit falsey BLOG value for %s', (key, value) => {
    expect(siteConfig(key, 'default')).toBe(value)
  })

  test.each([
    ['false', false],
    ['zero', 0],
    ['empty string', '']
  ])('preserves explicit falsey extendConfig %s values', (_, value) => {
    expect(
      siteConfig('NEXT_REVALIDATE_SECOND', 'default', {
        NEXT_REVALIDATE_SECOND: value
      })
    ).toBe(value)
  })

  test.each([
    ['false', false],
    ['zero', 0],
    ['empty string', '']
  ])('preserves explicit falsey default %s values', (_, value) => {
    expect(siteConfig('MISSING_VALUE', value)).toBe(value)
  })

  test('preserves an empty COMMENT_WALINE_SERVER_URL alias', () => {
    mockGetGlobalSnapshot.mockReturnValue({
      NOTION_CONFIG: {
        WALINE_SERVER_URL: '',
        NEXT_PUBLIC_WALINE_SERVER_URL: 'fallback-server'
      },
      THEME_CONFIG: {},
      siteInfo: {}
    })

    expect(siteConfig('COMMENT_WALINE_SERVER_URL', 'default-server')).toBe('')
  })

  test('preserves a false COMMENT_WALINE_RECENT alias', () => {
    mockGetGlobalSnapshot.mockReturnValue({
      NOTION_CONFIG: {
        WALINE_RECENT: false,
        NEXT_PUBLIC_WALINE_RECENT: true
      },
      THEME_CONFIG: {},
      siteInfo: {}
    })

    expect(siteConfig('COMMENT_WALINE_RECENT', true)).toBe(false)
  })
})
