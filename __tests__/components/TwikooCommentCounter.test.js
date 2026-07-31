import { render, waitFor } from '@testing-library/react'
import TwikooCommentCounter, {
  getCommentCounterPosts
} from '@/components/TwikooCommentCounter'
import { loadExternalResource } from '@/lib/utils'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key =>
    key === 'COMMENT_TWIKOO_CDN_URL'
      ? 'https://cdn.example.com/twikoo.js'
      : 'env-id'
  )
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ theme: 'light' })
}))

jest.mock('@/lib/utils', () => ({
  loadExternalResource: jest.fn()
}))

jest.mock('next/router', () => {
  const events = {}
  return { useRouter: () => ({ events }) }
})

describe('getCommentCounterPosts', () => {
  it('uses explicit posts when they are available', () => {
    const posts = [{ id: 'post-1' }]

    expect(getCommentCounterPosts({ posts, archivePosts: {} })).toBe(posts)
  })

  it('falls back to flattened archivePosts for archive pages', () => {
    expect(
      getCommentCounterPosts({
        archivePosts: {
          '2026-01': [{ id: 'post-1' }],
          '2025-12': [{ id: 'post-2' }]
        }
      })
    ).toEqual([{ id: 'post-1' }, { id: 'post-2' }])
  })
})

describe('TwikooCommentCounter', () => {
  beforeEach(() => {
    loadExternalResource.mockResolvedValue()
    window.twikoo = {
      getCommentsCount: jest.fn().mockResolvedValue([])
    }
  })

  afterEach(() => {
    delete window.twikoo
  })

  it('refetches counts when the rendered posts change', async () => {
    const { rerender } = render(
      <TwikooCommentCounter posts={[{ id: 'post-1', slug: 'first' }]} />
    )

    await waitFor(() =>
      expect(window.twikoo.getCommentsCount).toHaveBeenCalledWith(
        expect.objectContaining({ urls: ['/first'] })
      )
    )

    rerender(
      <TwikooCommentCounter posts={[{ id: 'post-2', slug: 'second' }]} />
    )

    await waitFor(() =>
      expect(window.twikoo.getCommentsCount).toHaveBeenCalledWith(
        expect.objectContaining({ urls: ['/second'] })
      )
    )
  })

  it('renders third-party count values as text', async () => {
    window.twikoo.getCommentsCount.mockResolvedValue([
      { url: '/first', count: '<img src=x>' }
    ])

    const { container } = render(
      <>
        <span className='comment-count-text-post-1' />
        <span className='comment-count-wrapper-post-1 hidden' />
        <TwikooCommentCounter posts={[{ id: 'post-1', slug: 'first' }]} />
      </>
    )

    await waitFor(() =>
      expect(
        container.querySelector('.comment-count-text-post-1')
      ).toHaveTextContent('<img src=x>')
    )
    expect(container.querySelector('img')).toBeNull()
    expect(
      container.querySelector('.comment-count-wrapper-post-1')
    ).not.toHaveClass('hidden')
  })
})
