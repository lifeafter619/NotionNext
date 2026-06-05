import { render, screen } from '@testing-library/react'
import { LayoutBase } from '@/themes/heo'

let mockFullWidth = true

jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/[prefix]/[slug]',
    pathname: '/[prefix]/[slug]',
    query: {
      prefix: 'article',
      slug: 'demo'
    },
    events: {
      on: jest.fn(),
      off: jest.fn()
    }
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    fullWidth: mockFullWidth,
    isDarkMode: false,
    onLoading: false,
    locale: {
      COMMON: {
        COMMENTS: 'Comments'
      }
    }
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      FONT_STYLE: '',
      HEO_LOADING_COVER: false,
      HEO_ANIMATE_ON_SCROLL: false,
      HEO_HERO_BODY_REVERSE: false
    }
    return config[key] ?? false
  })
}))

jest.mock('@/lib/plugins/wow', () => ({
  loadWowJS: jest.fn()
}))

jest.mock('@/lib/plugins/algoliaConfig', () => ({
  isAlgoliaSearchEnabled: jest.fn(() => false)
}))

jest.mock('algoliasearch', () => jest.fn())
jest.mock('@/components/GoogleAdsense', () => ({
  AdSlot: () => null
}))
jest.mock('@/components/HeroIcons', () => ({
  HashTag: () => null
}))
jest.mock('@/components/LazyImage', () => () => null)
jest.mock('@/components/LoadingCover', () => () => null)
jest.mock('@/components/Mark', () => jest.fn())
jest.mock('@/components/NotionPage', () => () => null)
jest.mock('@/components/WWAds', () => () => null)
jest.mock('@/components/ArticleExpirationNotice', () => () => null)
jest.mock('@/components/AISummary', () => () => null)
jest.mock('@/components/Comment', () => () => null)
jest.mock('@/components/ShareBar', () => () => null)
jest.mock('@/components/SearchHighlightNav', () => () => null)
jest.mock('@/components/SmartLink', () => {
  return function SmartLink({ href, children, ...props }) {
    return (
      <a href={typeof href === 'string' ? href : href?.pathname} {...props}>
        {children}
      </a>
    )
  }
})

jest.mock('@/themes/heo/components/BlogPostArchive', () => () => null)
jest.mock('@/themes/heo/components/BlogPostListPage', () => () => null)
jest.mock('@/themes/heo/components/BlogPostListScroll', () => () => null)
jest.mock('@/themes/heo/components/CategoryBar', () => () => null)
jest.mock('@/themes/heo/components/FloatTocButton', () => () => null)
jest.mock('@/themes/heo/components/Footer', () => () => null)
jest.mock('@/themes/heo/components/Header', () => () => null)
jest.mock('@/themes/heo/components/Hero', () => () => null)
jest.mock('@/themes/heo/components/LatestPostsGroup', () => () => null)
jest.mock('@/themes/heo/components/NoticeBar', () => ({
  NoticeBar: () => null
}))
jest.mock('@/themes/heo/components/PostHeader', () => {
  return function PostHeader({ post }) {
    if (!post) return null
    return <div data-testid='heo-post-header'>article-search</div>
  }
})
jest.mock('@/themes/heo/components/PostLock', () => ({
  PostLock: () => null
}))
jest.mock('@/themes/heo/components/PostAdjacent', () => () => null)
jest.mock('@/themes/heo/components/PostCopyright', () => () => null)
jest.mock('@/themes/heo/components/PostRecommend', () => () => null)
jest.mock('@/themes/heo/components/SearchNav', () => () => null)
jest.mock('@/themes/heo/components/SideRight', () => {
  return function SideRight({ post }) {
    if (!post) return null
    return <aside data-testid='heo-side-right'>article-toc</aside>
  }
})
jest.mock('@/themes/heo/style', () => ({
  Style: () => null
}))

describe('heo responsive article controls', () => {
  const post = {
    title: 'Demo article',
    toc: [{ id: 'heading-1', text: 'Heading', indentLevel: 0 }],
    fullWidth: true
  }

  beforeEach(() => {
    mockFullWidth = true
  })

  it('keeps the article search header available for full-width posts', () => {
    render(
      <LayoutBase post={post}>
        <main>Article body</main>
      </LayoutBase>
    )

    expect(screen.getByTestId('heo-post-header')).toHaveTextContent(
      'article-search'
    )
  })

  it('keeps the article toc area available for full-width posts', () => {
    render(
      <LayoutBase post={post}>
        <main>Article body</main>
      </LayoutBase>
    )

    expect(screen.getByTestId('heo-side-right')).toHaveTextContent(
      'article-toc'
    )
  })
})
