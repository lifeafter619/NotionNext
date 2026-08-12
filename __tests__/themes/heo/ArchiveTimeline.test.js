import { render, screen } from '@testing-library/react'
import ArchiveTimeline from '@/themes/heo/components/ArchiveTimeline'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(() => '')
}))

jest.mock('@/themes/heo/components/HeoLink', () => {
  return function HeoLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

jest.mock('@/lib/utils/formatDate', () => ({
  formatDateFmt: jest.fn((value, fmt) => {
    const d = new Date(value)
    if (!Number.isFinite(d.getTime())) return ''
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return fmt === 'MM-dd' ? `${mm}-${dd}` : `${mm}-${dd}`
  })
}))

const makePost = (overrides = {}) => ({
  id: 'p1',
  slug: 'hello-world',
  title: 'Hello World',
  publishDate: '2026-08-10T00:00:00.000Z',
  category: '建站',
  href: '/article/hello-world',
  ...overrides
})

describe('ArchiveTimeline', () => {
  it('renders nothing for empty data', () => {
    const { container } = render(<ArchiveTimeline archivePosts={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for non-object input', () => {
    const { container } = render(<ArchiveTimeline archivePosts={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('groups posts by year in descending order', () => {
    const archivePosts = {
      '2026-08': [makePost({ id: 'a', slug: 'a' })],
      '2025-03': [makePost({ id: 'b', slug: 'b' })],
      '2026-01': [makePost({ id: 'c', slug: 'c' })]
    }
    render(<ArchiveTimeline archivePosts={archivePosts} />)

    const yearHeaders = screen.getAllByText(/2026|2025/)
    // 2026 group comes first (descending), then 2025.
    expect(yearHeaders[0]).toHaveTextContent('2026')
    expect(yearHeaders[yearHeaders.length - 1]).toHaveTextContent('2025')
  })

  it('renders article links and dates', () => {
    const post = makePost()
    const { container } = render(
      <ArchiveTimeline archivePosts={{ '2026-08': [post] }} />
    )

    const link = container.querySelector('a[href="/article/hello-world"]')
    expect(link).toBeInTheDocument()
    expect(link).toHaveTextContent('Hello World')

    // The post date renders as MM-dd.
    expect(screen.getByText('08-10')).toBeInTheDocument()
  })

  it('sets the month-key anchor id on the first post of each month', () => {
    const posts = [
      makePost({ id: 'first', slug: 'first' }),
      makePost({ id: 'second', slug: 'second' })
    ]
    const { container } = render(
      <ArchiveTimeline archivePosts={{ '2026-08': posts }} />
    )

    const firstLi = container.querySelector('li[id="2026-08"]')
    expect(firstLi).toBeInTheDocument()
    // The second post should NOT carry the month anchor id.
    const allLis = container.querySelectorAll('li[id]')
    expect(allLis).toHaveLength(1)
  })

  it('does not mutate the input archivePosts object', () => {
    const archivePosts = {
      '2026-08': [makePost()],
      '2026-01': [makePost({ id: 'x', slug: 'x' })]
    }
    const snapshot = JSON.parse(JSON.stringify(archivePosts))
    render(<ArchiveTimeline archivePosts={archivePosts} />)
    expect(archivePosts).toEqual(snapshot)
    // Same key set and same object identity.
    expect(Object.keys(archivePosts)).toEqual(Object.keys(snapshot))
  })

  it('falls back to "未命名" for posts without a title', () => {
    render(
      <ArchiveTimeline
        archivePosts={{
          '2026-08': [makePost({ title: undefined, slug: 'no-title' })]
        }}
      />
    )
    expect(screen.getByText('未命名')).toBeInTheDocument()
  })
})
