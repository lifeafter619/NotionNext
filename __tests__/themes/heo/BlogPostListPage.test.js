import { render, screen } from '@testing-library/react'
import BlogPostListPage from '@/themes/heo/components/BlogPostListPage'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) => {
    if (key === 'POSTS_PER_PAGE') return 10
    if (key === 'HEO_HOME_POST_TWO_COLS') return false
    return defaultValue ?? null
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    NOTION_CONFIG: {}
  })
}))

jest.mock('@/themes/heo/components/BlogPostCard', () => {
  return function BlogPostCard({ index, post }) {
    return <article data-testid='post-card'>{`${index}:${post.title}`}</article>
  }
})

jest.mock('@/themes/heo/components/BlogPostListEmpty', () => {
  return function BlogPostListEmpty() {
    return <div>Empty</div>
  }
})

jest.mock('@/themes/heo/components/PaginationNumber', () => {
  return function PaginationNumber() {
    return <nav>Pagination</nav>
  }
})

describe('heo BlogPostListPage', () => {
  it('passes stable map indexes without scanning posts with indexOf', () => {
    const posts = [
      { id: 'post-1', title: 'Post 1' },
      { id: 'post-2', title: 'Post 2' }
    ]
    posts.indexOf = jest.fn(() => {
      throw new Error('indexOf should not be used while rendering post cards')
    })

    render(<BlogPostListPage posts={posts} postCount={posts.length} />)

    expect(
      screen.getAllByTestId('post-card').map(node => node.textContent)
    ).toEqual(['0:Post 1', '1:Post 2'])
    expect(posts.indexOf).not.toHaveBeenCalled()
  })
})
