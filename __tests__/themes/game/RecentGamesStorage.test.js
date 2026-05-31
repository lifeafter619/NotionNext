import { render, screen, waitFor } from '@testing-library/react'
import { LayoutBase, LayoutSlug } from '@/themes/game'

jest.mock('@/components/Comment', () => () => null)
jest.mock('@/components/GoogleAdsense', () => ({
  AdSlot: () => null
}))
jest.mock('@/components/Mark', () => jest.fn())
jest.mock('@/components/NotionPage', () => {
  return function NotionPage() {
    return <div>Notion page</div>
  }
})
jest.mock('@/components/PWA', () => ({
  PWA: jest.fn()
}))
jest.mock('@/components/ShareBar', () => () => null)
jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => fallback)
}))
jest.mock('@/lib/plugins/wow', () => ({
  loadWowJS: jest.fn()
}))
jest.mock('@/components/SmartLink', () => {
  return function SmartLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})
jest.mock('@/themes/game/components/Announcement', () => () => null)
jest.mock('@/themes/game/components/ArticleLock', () => ({
  ArticleLock: () => null
}))
jest.mock('@/themes/game/components/BlogPostBar', () => () => null)
jest.mock('@/themes/game/components/Footer', () => ({
  Footer: () => null
}))
jest.mock('@/themes/game/components/GameEmbed', () => {
  return function GameEmbed() {
    return <div>Game</div>
  }
})
jest.mock('@/themes/game/components/GameListIndexCombine', () => ({
  GameListIndexCombine: () => null
}))
jest.mock('@/themes/game/components/GameListRealate', () => ({
  GameListRelate: () => null
}))
jest.mock('@/themes/game/components/GroupCategory', () => () => null)
jest.mock('@/themes/game/components/GroupTag', () => () => null)
jest.mock('@/themes/game/components/Header', () => () => null)
jest.mock('@/themes/game/components/MenuList', () => ({
  MenuList: () => null
}))
jest.mock('@/themes/game/components/PostInfo', () => () => null)
jest.mock('@/themes/game/components/SideBarContent', () => () => null)
jest.mock('@/themes/game/components/SideBarDrawer', () => {
  return function SideBarDrawer({ children }) {
    return <div>{children}</div>
  }
})
jest.mock('@/themes/game/style', () => ({
  Style: () => null
}))

describe('Game recent games storage', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('ignores corrupted recent_games data and keeps the current post usable', async () => {
    const post = {
      id: 'post-1',
      title: 'Playable game',
      summary: 'A game page',
      tags: ['Recommend']
    }
    const getItem = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue('{bad json')
    const setItem = jest.spyOn(Storage.prototype, 'setItem')

    render(
      <LayoutBase
        allNavPages={[post]}
        siteInfo={{ title: 'Site' }}
        tagOptions={[]}
        categoryOptions={[]}>
        <LayoutSlug
          post={post}
          siteInfo={{ title: 'Site' }}
          allNavPages={[post]}
          recommendPosts={[]}
        />
      </LayoutBase>
    )

    await waitFor(() => {
      expect(setItem).toHaveBeenCalledWith(
        'recent_games',
        JSON.stringify([post])
      )
    })
  })

  it('keeps the current post usable when recent_games storage is unavailable', async () => {
    const post = {
      id: 'post-1',
      title: 'Playable game',
      summary: 'A game page',
      tags: ['Recommend']
    }
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(() => {
      render(
        <LayoutBase
          allNavPages={[post]}
          siteInfo={{ title: 'Site' }}
          tagOptions={[]}
          categoryOptions={[]}>
          <LayoutSlug
            post={post}
            siteInfo={{ title: 'Site' }}
            allNavPages={[post]}
            recommendPosts={[]}
          />
        </LayoutBase>
      )
    }).not.toThrow()

    expect(screen.getByText('Game')).toBeInTheDocument()
  })
})
