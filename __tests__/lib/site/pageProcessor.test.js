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
})
