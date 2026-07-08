import { buildRssPostLink, getPublicRssPosts } from '@/lib/utils/rssApi'

describe('/api/rss helpers', () => {
  it('keeps only public published posts and sorts newest first', () => {
    const posts = getPublicRssPosts([
      {
        type: 'Post',
        status: 'Published',
        title: 'old',
        publishDay: '2026-01-01'
      },
      {
        type: 'Post',
        status: 'Published',
        title: 'locked',
        password: 'hashed-password',
        publishDay: '2026-03-01'
      },
      {
        type: 'Post',
        status: 'Draft',
        title: 'draft',
        publishDay: '2026-04-01'
      },
      {
        type: 'Post',
        status: 'Published',
        title: 'new',
        password: '',
        publishDay: '2026-02-01'
      }
    ])

    expect(posts.map(post => post.title)).toEqual(['new', 'old'])
  })

  it('normalizes site links and slugs without producing doubled slashes', () => {
    expect(buildRssPostLink('https://example.com/', '/article/post')).toBe(
      'https://example.com/article/post'
    )
  })
})
