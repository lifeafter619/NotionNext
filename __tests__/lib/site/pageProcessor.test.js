const {
  handleDataBeforeReturn
} = require('@/lib/site/processors/page.processor')

function createSiteData(overrides = {}) {
  return {
    NOTION_CONFIG: {},
    siteInfo: {
      title: 'Site',
      description: 'Description',
      pageCover: '/cover.png',
      icon: '/icon.png',
      link: 'https://example.com'
    },
    notice: null,
    allPages: [],
    allNavPages: [],
    latestPosts: [],
    categoryOptions: [],
    tagOptions: [],
    customNav: [],
    customMenu: [],
    postCount: 0,
    ...overrides
  }
}

describe('handleDataBeforeReturn', () => {
  it('cleans custom menu items recursively before returning site data', () => {
    const data = createSiteData({
      customMenu: [
        {
          id: 'menu-1',
          name: 'Menu',
          title: 'Menu title',
          href: '/menu',
          show: true,
          status: 'Published',
          password: 'hashed-password',
          subMenus: [
            {
              id: 'submenu-1',
              name: 'Sub',
              title: 'Sub title',
              href: '/sub',
              show: true,
              password: 'nested-secret'
            }
          ]
        }
      ]
    })

    const result = handleDataBeforeReturn(data)

    expect(result.customMenu).toEqual([
      {
        id: 'menu-1',
        name: 'Menu',
        title: 'Menu title',
        href: '/menu',
        show: true,
        subMenus: [
          {
            id: 'submenu-1',
            name: 'Sub',
            title: 'Sub title',
            href: '/sub',
            show: true
          }
        ]
      }
    ])
  })

  it('strips server-only fields from global page lists', () => {
    const page = {
      id: 'page-1',
      title: 'Page',
      slug: 'page',
      type: 'Post',
      status: 'Published',
      password: 'hashed-password',
      content: ['block-1'],
      toc: [{ id: 'block-1' }],
      blockMap: { block: {} },
      customField: 'keep-me'
    }
    const data = createSiteData({
      allPages: [page],
      allNavPages: [page],
      latestPosts: [page]
    })

    const result = handleDataBeforeReturn(data)

    for (const post of [
      result.allPages[0],
      result.allNavPages[0],
      result.latestPosts[0]
    ]) {
      expect(post.password).toBeUndefined()
      expect(post.content).toBeUndefined()
      expect(post.toc).toBeUndefined()
      expect(post.blockMap).toBeUndefined()
      expect(post.customField).toBe('keep-me')
    }
  })
})
