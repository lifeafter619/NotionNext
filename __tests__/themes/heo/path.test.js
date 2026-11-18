import { withHeoSubPath } from '@/themes/heo/utils/path'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) => defaultValue)
}))

describe('withHeoSubPath', () => {
  test('prefixes root-relative routes and preserves suffixes', () => {
    expect(withHeoSubPath('/', '/blog')).toBe('/blog/')
    expect(withHeoSubPath('/search?q=heo#results', '/blog/')).toBe(
      '/blog/search?q=heo#results'
    )
  })

  test('does not duplicate an existing sub path', () => {
    expect(withHeoSubPath('/blog/article', 'blog')).toBe('/blog/article')
    expect(withHeoSubPath('/blog?view=all', '/blog')).toBe('/blog?view=all')
  })

  test('leaves non-root internal values and external links untouched', () => {
    expect(withHeoSubPath('#catalog', '/blog')).toBe('#catalog')
    expect(withHeoSubPath('?page=2', '/blog')).toBe('?page=2')
    expect(withHeoSubPath('mailto:test@example.com', '/blog')).toBe(
      'mailto:test@example.com'
    )
    expect(withHeoSubPath('https://example.com/a', '/blog')).toBe(
      'https://example.com/a'
    )
    expect(withHeoSubPath('//cdn.example.com/a', '/blog')).toBe(
      '//cdn.example.com/a'
    )
  })

  test('supports Next.js href objects without mutating the input', () => {
    const href = { pathname: '/tag/demo', query: { page: 2 } }
    expect(withHeoSubPath(href, '/blog')).toEqual({
      pathname: '/blog/tag/demo',
      query: { page: 2 }
    })
    expect(href.pathname).toBe('/tag/demo')
  })
})
