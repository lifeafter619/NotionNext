import { render, screen } from '@testing-library/react'
import BlogPostListScroll from '@/themes/heo/components/BlogPostListScroll'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) => {
    if (key === 'POSTS_PER_PAGE') return 10
    if (key === 'HEO_HOME_POST_TWO_COLS') return false
    return defaultValue ?? null
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    NOTION_CONFIG: {},
    locale: {
      COMMON: {
        MORE: 'More',
        NO_MORE: 'No more'
      }
    }
  })
}))

jest.mock('@/themes/heo/components/BlogPostCard', () => {
  return function BlogPostCard({ post }) {
    return <article>{post.title}</article>
  }
})

jest.mock('@/themes/heo/components/BlogPostListEmpty', () => {
  return function BlogPostListEmpty() {
    return <div>Empty</div>
  }
})

describe('heo BlogPostListScroll', () => {
  it('does not attach a scroll listener when there are no more posts', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

    render(
      <BlogPostListScroll
        posts={[
          {
            id: 'post-1',
            title: 'Post 1'
          }
        ]}
      />
    )

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.anything()
    )
    expect(screen.getByRole('button', { name: 'No more' })).toBeDisabled()
  })

  it('attaches a scroll listener when more posts are available', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
    const posts = Array.from({ length: 11 }, (_, index) => ({
      id: `post-${index}`,
      title: `Post ${index}`
    }))

    render(<BlogPostListScroll posts={posts} />)

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      { passive: true }
    )
  })
})
