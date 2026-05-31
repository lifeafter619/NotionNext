import {
  cleanMenuItemsForClient,
  cleanPostListForClient,
  cleanPostListItemForClient,
  stripServerOnlyPostFields
} from '@/lib/utils/clientPost'

describe('client post data cleaning', () => {
  it('removes sensitive and server-only fields from list post items', () => {
    const post = {
      id: 'post1',
      title: 'Post',
      slug: 'article/post',
      href: '/article/post',
      type: 'Post',
      status: 'Published',
      summary: 'Summary',
      category: 'Category',
      tags: ['tag'],
      tagItems: [{ name: 'tag', color: 'blue' }],
      publishDate: 1,
      publishDay: '2026-01-01',
      lastEditedDate: '2026-01-02T00:00:00.000Z',
      lastEditedDay: '2026-01-02',
      pageIcon: 'P',
      pageCover: '/cover.png',
      pageCoverThumbnail: '/cover-small.png',
      ext: { video: '/preview.mp4' },
      target: '_self',
      password: 'hashed-password',
      content: ['block1'],
      toc: [{ id: 'block1' }],
      blockMap: { block: { block1: { value: { id: 'block1' } } } }
    }

    const result = cleanPostListItemForClient(post)

    expect(result).toEqual({
      id: 'post1',
      title: 'Post',
      slug: 'article/post',
      href: '/article/post',
      type: 'Post',
      status: 'Published',
      summary: 'Summary',
      category: 'Category',
      tags: ['tag'],
      tagItems: [{ name: 'tag', color: 'blue' }],
      publishDate: 1,
      publishDay: '2026-01-01',
      lastEditedDate: '2026-01-02T00:00:00.000Z',
      lastEditedDay: '2026-01-02',
      pageIcon: 'P',
      pageCover: '/cover.png',
      pageCoverThumbnail: '/cover-small.png',
      ext: { video: '/preview.mp4' },
      target: '_self'
    })
    expect(result.password).toBeUndefined()
    expect(result.content).toBeUndefined()
    expect(result.toc).toBeUndefined()
    expect(result.blockMap).toBeUndefined()
    expect(post.password).toBe('hashed-password')
  })

  it('keeps preview blockMap only when explicitly requested', () => {
    const post = {
      id: 'post1',
      title: 'Post',
      slug: 'article/post',
      blockMap: { block: { block1: { value: { id: 'block1' } } } },
      password: 'hashed-password'
    }

    const result = cleanPostListItemForClient(post, { keepBlockMap: true })

    expect(result.blockMap).toEqual(post.blockMap)
    expect(result.password).toBeUndefined()
  })

  it('keeps search payload fields only when explicitly requested', () => {
    const post = {
      id: 'post1',
      title: 'Post',
      content: 'Full text for local search',
      results: ['local search'],
      password: 'hashed-password'
    }

    const result = cleanPostListItemForClient(post, {
      keepContent: true,
      keepResults: true
    })

    expect(result).toEqual({
      id: 'post1',
      title: 'Post',
      content: 'Full text for local search',
      results: ['local search']
    })
    expect(result.password).toBeUndefined()
  })

  it('cleans arrays of post list items', () => {
    const result = cleanPostListForClient([
      { id: 'post1', title: 'Post 1', password: 'secret' },
      null,
      { id: 'post2', title: 'Post 2', content: ['block1'] }
    ])

    expect(result).toEqual([
      { id: 'post1', title: 'Post 1' },
      null,
      { id: 'post2', title: 'Post 2' }
    ])
  })

  it('removes page metadata from custom menu items recursively', () => {
    const menu = [
      {
        id: 'menu1',
        name: 'Menu',
        title: 'Menu title',
        icon: 'fa-home',
        href: '/',
        target: '_self',
        show: true,
        status: 'Published',
        password: 'hashed-password',
        publishDate: 1,
        subMenus: [
          {
            id: 'submenu1',
            name: 'Sub',
            title: 'Sub title',
            icon: 'fa-tag',
            href: '/tag',
            target: '_self',
            show: true,
            password: 'nested-secret'
          }
        ]
      }
    ]

    const result = cleanMenuItemsForClient(menu)

    expect(result).toEqual([
      {
        id: 'menu1',
        name: 'Menu',
        title: 'Menu title',
        icon: 'fa-home',
        href: '/',
        target: '_self',
        show: true,
        subMenus: [
          {
            id: 'submenu1',
            name: 'Sub',
            title: 'Sub title',
            icon: 'fa-tag',
            href: '/tag',
            target: '_self',
            show: true
          }
        ]
      }
    ])
  })

  it('strips server-only fields without dropping custom page metadata', () => {
    const post = {
      id: 'member-1',
      title: 'Member',
      slug: 'member',
      type: 'Member',
      avatar: '/avatar.png',
      role: 'Maintainer',
      password: 'hashed-password',
      content: ['block1'],
      toc: [{ id: 'block1' }],
      blockMap: { block: {} }
    }

    const result = stripServerOnlyPostFields(post)

    expect(result).toEqual({
      id: 'member-1',
      title: 'Member',
      slug: 'member',
      type: 'Member',
      avatar: '/avatar.png',
      role: 'Maintainer'
    })
    expect(post.password).toBe('hashed-password')
  })
})
