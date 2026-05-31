import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LayoutSearch } from '@/themes/heo'

const mockRouterPush = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/search/[keyword]',
    query: {},
    push: mockRouterPush
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      LINK: 'https://example.com',
      POST_LIST_STYLE: 'page'
    }
    return config[key] ?? false
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    fullWidth: false,
    isDarkMode: false,
    onLoading: false,
    locale: {
      COMMON: {
        NO_RESULTS_FOUND: 'No results',
        MORE: 'More',
        NO_MORE: 'No more',
        CATEGORY: 'Category'
      },
      NAV: {
        SEARCH: 'Search'
      },
      SEARCH: {
        ARTICLES: 'Articles',
        TAGS: 'Tags'
      }
    }
  })
}))

jest.mock('@/lib/plugins/algoliaConfig', () => ({
  isAlgoliaSearchEnabled: jest.fn(() => false)
}))
jest.mock('@/lib/plugins/wow', () => ({
  loadWowJS: jest.fn()
}))
jest.mock('@/components/Mark', () => jest.fn())
jest.mock('algoliasearch', () => jest.fn())
jest.mock('@/components/GoogleAdsense', () => ({
  AdSlot: () => null
}))
jest.mock('@/components/HeroIcons', () => ({
  HashTag: () => null
}))
jest.mock('@/components/LazyImage', () => {
  return function LazyImage({ priority: _priority, alt, ...props }) {
    return <img alt={alt || 'cover'} {...props} />
  }
})
jest.mock('@/components/LoadingCover', () => () => null)
jest.mock('@/components/SearchHighlightNav', () => () => null)
jest.mock('@/components/ArticleExpirationNotice', () => () => null)
jest.mock('@/components/SmartLink', () => {
  return function SmartLink({ href, children, ...props }) {
    return (
      <a href={typeof href === 'string' ? href : href?.pathname} {...props}>
        {children}
      </a>
    )
  }
})
jest.mock('@/themes/heo/components/SearchNav', () => () => null)
jest.mock('@/themes/heo/components/CategoryBar', () => () => null)
jest.mock('@/themes/heo/components/Header', () => () => null)
jest.mock('@/themes/heo/components/Hero', () => () => null)
jest.mock('@/themes/heo/components/PostHeader', () => () => null)
jest.mock('@/themes/heo/components/Footer', () => () => null)
jest.mock('@/themes/heo/components/FloatTocButton', () => () => null)
jest.mock('@/themes/heo/components/LatestPostsGroup', () => () => null)
jest.mock('@/themes/heo/components/NoticeBar', () => ({
  NoticeBar: () => null
}))
jest.mock('@/themes/heo/components/PostLock', () => ({
  PostLock: () => null
}))
jest.mock('@/themes/heo/components/SideRight', () => () => null)
jest.mock('@/themes/heo/style', () => ({
  Style: () => null
}))

describe('heo search result jump navigation', () => {
  beforeEach(() => {
    mockRouterPush.mockClear()
    mockRouterPush.mockResolvedValue(true)
  })

  it('uses client-side navigation when jumping to a search match', async () => {
    render(
      <LayoutSearch
        keyword='hello 世界'
        posts={[
          {
            id: 'post-1',
            title: 'Demo post',
            summary: 'Summary',
            content: 'This body contains hello 世界 in the article.',
            href: '/demo-post',
            slug: 'demo-post',
            createdTime: '2026-05-30T00:00:00Z'
          }
        ]}
        postCount={1}
        siteInfo={{ pageCover: '/cover.jpg' }}
        categoryOptions={[]}
        tagOptions={[]}
      />
    )

    fireEvent.click(screen.getByText('跳转到搜索位置'))

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/demo-post?keyword=hello%20%E4%B8%96%E7%95%8C'
      )
    })
  })
})
