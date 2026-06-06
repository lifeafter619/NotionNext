import { render, screen, waitFor } from '@testing-library/react'

let mockFullWidth = true
let mockAlgoliaModuleLoadCount = 0
let mockGoogleAdsenseModuleLoadCount = 0
let mockHeadlessUiModuleLoadCount = 0
let mockSideRightModuleLoadCount = 0
let mockSideRightRenderCount = 0

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width
  })
}

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

jest.mock('next/dynamic', () => {
  const React = require('react')
  return loader => {
    function DynamicComponent(props) {
      const source = loader.toString()
      if (!source.includes('SideRight')) {
        return null
      }
      const mod = require('@/themes/heo/components/SideRight')
      const LoadedComponent = mod.default || mod
      return React.createElement(LoadedComponent, props)
    }
    DynamicComponent.displayName = 'LoadableComponent'
    DynamicComponent.preload = jest.fn()
    return DynamicComponent
  }
})

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

jest.mock('algoliasearch', () => {
  mockAlgoliaModuleLoadCount += 1
  return jest.fn()
})
jest.mock('@/components/GoogleAdsense', () => {
  mockGoogleAdsenseModuleLoadCount += 1
  return {
    AdSlot: () => null
  }
})
jest.mock('@headlessui/react', () => {
  mockHeadlessUiModuleLoadCount += 1
  return {
    Transition: ({ show, children }) => (show ? <>{children}</> : null)
  }
})
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
  mockSideRightModuleLoadCount += 1
  return {
    __esModule: true,
    default: function SideRight({ post }) {
      mockSideRightRenderCount += 1
      if (!post) return null
      return <aside data-testid='heo-side-right'>article-toc</aside>
    }
  }
})
jest.mock('@/themes/heo/style', () => ({
  Style: () => null
}))

function getLayoutBase() {
  return require('@/themes/heo').LayoutBase
}

describe('heo responsive article controls', () => {
  const post = {
    title: 'Demo article',
    toc: [{ id: 'heading-1', text: 'Heading', indentLevel: 0 }],
    fullWidth: true
  }

  beforeEach(() => {
    mockFullWidth = true
    mockAlgoliaModuleLoadCount = 0
    mockGoogleAdsenseModuleLoadCount = 0
    mockHeadlessUiModuleLoadCount = 0
    mockSideRightModuleLoadCount = 0
    mockSideRightRenderCount = 0
    setViewportWidth(1440)
  })

  it('does not load Headless UI when only importing heo layouts', () => {
    jest.isolateModules(() => {
      require('@/themes/heo')
    })

    expect(mockHeadlessUiModuleLoadCount).toBe(0)
  })

  it('does not load the Google Adsense module when only importing heo layouts', () => {
    jest.isolateModules(() => {
      require('@/themes/heo')
    })

    expect(mockGoogleAdsenseModuleLoadCount).toBe(0)
  })

  it('does not load the Algolia client when only importing heo layouts', () => {
    jest.isolateModules(() => {
      require('@/themes/heo')
    })

    expect(mockAlgoliaModuleLoadCount).toBe(0)
  })

  it('does not load the desktop sidebar module when only importing heo layouts', () => {
    jest.isolateModules(() => {
      require('@/themes/heo')
    })

    expect(mockSideRightModuleLoadCount).toBe(0)
  })

  it('keeps the article search header available for full-width posts', () => {
    const LayoutBase = getLayoutBase()

    render(
      <LayoutBase post={post}>
        <main>Article body</main>
      </LayoutBase>
    )

    expect(screen.getByTestId('heo-post-header')).toHaveTextContent(
      'article-search'
    )
  })

  it('keeps the article toc area available for full-width posts', async () => {
    const LayoutBase = getLayoutBase()

    render(
      <LayoutBase post={post}>
        <main>Article body</main>
      </LayoutBase>
    )

    await waitFor(() => {
      expect(screen.getByTestId('heo-side-right')).toHaveTextContent(
        'article-toc'
      )
    })
  })

  it('does not mount desktop sidebar work on mobile article widths', () => {
    setViewportWidth(390)
    const LayoutBase = getLayoutBase()

    render(
      <LayoutBase post={post}>
        <main>Article body</main>
      </LayoutBase>
    )

    expect(mockSideRightModuleLoadCount).toBe(0)
    expect(mockSideRightRenderCount).toBe(0)
    expect(screen.queryByTestId('heo-side-right')).not.toBeInTheDocument()
  })
})
