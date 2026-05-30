jest.mock('@/lib/plugins/algolia', () => ({
  uploadDataToAlgolia: jest.fn()
}))

jest.mock('@/lib/plugins/algoliaConfig', () => ({
  hasAlgoliaAdminConfig: jest.fn(() => false)
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) =>
    key === 'POST_RECOMMEND_COUNT' ? 6 : fallback
  )
}))

jest.mock('@/lib/db/notion/getPageTableOfContents', () => ({
  getPageTableOfContents: jest.fn(() => [])
}))

jest.mock('@/lib/db/notion/getPageContentText', () => ({
  getPageContentText: jest.fn(() => '')
}))

jest.mock('@/lib/plugins/wordCount', () => ({
  countWords: jest.fn(() => ({ wordCount: 0, readTime: 0 }))
}))

import { processPostData } from '@/lib/utils/post'

describe('processPostData', () => {
  it('sanitizes adjacent and recommended post summaries before sending article props', async () => {
    const prev = {
      id: 'prev',
      type: 'Post',
      status: 'Published',
      title: 'Previous',
      slug: 'article/previous',
      href: '/article/previous',
      tags: ['other'],
      password: 'prev-password-hash',
      content: ['block1'],
      toc: [{ id: 'block1' }],
      blockMap: { block: {} }
    }
    const current = {
      id: 'current',
      type: 'Post',
      status: 'Published',
      title: 'Current',
      slug: 'article/current',
      href: '/article/current',
      tags: ['shared'],
      password: 'current-password-hash'
    }
    const next = {
      id: 'next',
      type: 'Post',
      status: 'Published',
      title: 'Next',
      slug: 'article/next',
      href: '/article/next',
      tags: ['shared'],
      password: 'next-password-hash',
      content: ['block2']
    }
    const recommended = {
      id: 'recommended',
      type: 'Post',
      status: 'Published',
      title: 'Recommended',
      slug: 'article/recommended',
      href: '/article/recommended',
      tags: ['shared'],
      password: 'recommended-password-hash',
      blockMap: { block: {} }
    }
    const props = {
      post: current,
      allPages: [prev, current, next, recommended]
    }

    await processPostData(props, 'test')

    expect(props.post.password).toBe('current-password-hash')
    expect(props.prev).toEqual(
      expect.objectContaining({
        id: 'prev',
        title: 'Previous',
        slug: 'article/previous'
      })
    )
    expect(props.next).toEqual(
      expect.objectContaining({
        id: 'next',
        title: 'Next',
        slug: 'article/next'
      })
    )
    expect(props.prev.password).toBeUndefined()
    expect(props.next.password).toBeUndefined()
    expect(props.next.content).toBeUndefined()
    expect(props.recommendPosts).toHaveLength(2)
    expect(props.recommendPosts.map(post => post.id)).toEqual([
      'next',
      'recommended'
    ])
    props.recommendPosts.forEach(post => {
      expect(post.password).toBeUndefined()
      expect(post.content).toBeUndefined()
      expect(post.blockMap).toBeUndefined()
    })
    expect(props.allPages).toBeUndefined()
  })
})
