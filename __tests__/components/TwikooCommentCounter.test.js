import { getCommentCounterPosts } from '@/components/TwikooCommentCounter'

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
