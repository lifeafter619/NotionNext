import { render, screen } from '@testing-library/react'

const mockConfig = {}

jest.mock('next/router', () => ({
  useRouter: () => ({ route: '/' })
}))

jest.mock('next/dynamic', () => () => () => null)

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) =>
    Object.prototype.hasOwnProperty.call(mockConfig, key)
      ? mockConfig[key]
      : defaultValue
  )
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ fullWidth: false, isDarkMode: false })
}))

jest.mock('@/lib/plugins/algoliaConfig', () => ({
  isAlgoliaSearchEnabled: jest.fn(() => false)
}))

jest.mock('@/lib/plugins/wow', () => ({ loadWowJS: jest.fn() }))
jest.mock('@/components/LazyImage', () => () => null)
jest.mock('@/components/LoadingCover', () => () => null)
jest.mock('@/components/Mark', () => jest.fn())
jest.mock('@/components/SearchHighlightNav', () => () => null)
jest.mock('@/components/SmartLink', () => {
  return function MockSmartLink({ children }) {
    return children
  }
})
jest.mock('@/components/ArticleExpirationNotice', () => () => null)
jest.mock('@/components/BeiAnGongAn', () => ({ BeiAnGongAn: () => null }))
jest.mock('@/components/CopyRightDate', () => () => null)
jest.mock('@/components/PoweredBy', () => () => null)

jest.mock('@/themes/heo/components/BlogPostArchive', () => () => null)
jest.mock('@/themes/heo/components/BlogPostListPage', () => () => null)
jest.mock('@/themes/heo/components/BlogPostListScroll', () => () => null)
jest.mock('@/themes/heo/components/CategoryBar', () => () => null)
jest.mock('@/themes/heo/components/FloatTocButton', () => () => null)
jest.mock('@/themes/heo/components/Header', () => () => null)
jest.mock('@/themes/heo/components/Hero', () => {
  return function MockHero() {
    return <div data-testid='heo-home-hero'>Hero</div>
  }
})
jest.mock('@/themes/heo/components/LatestPostsGroup', () => () => null)
jest.mock('@/themes/heo/components/NoticeBar', () => ({
  NoticeBar: function MockNoticeBar() {
    return <div data-testid='heo-notice'>Notice</div>
  }
}))
jest.mock('@/themes/heo/components/PostHeader', () => () => null)
jest.mock('@/themes/heo/components/PostLock', () => ({ PostLock: () => null }))
jest.mock('@/themes/heo/components/SearchNav', () => () => null)
jest.mock('@/themes/heo/components/SocialButton', () => () => null)
jest.mock('@/themes/heo/style', () => ({ Style: () => null }))

const { LayoutBase } = require('@/themes/heo')
const Footer = require('@/themes/heo/components/Footer').default

describe('heo configuration rendering', () => {
  beforeEach(() => {
    Object.keys(mockConfig).forEach(key => delete mockConfig[key])
    Object.assign(mockConfig, {
      FONT_STYLE: '',
      HEO_ANIMATE_ON_SCROLL: false,
      HEO_LOADING_COVER: false,
      HEO_HERO_BODY_REVERSE: false
    })
  })

  it('omits the home Hero and its wrapper when the banner is disabled', () => {
    mockConfig.HEO_HOME_BANNER_ENABLE = false

    const { container } = render(
      <LayoutBase>
        <main>Home</main>
      </LayoutBase>
    )

    expect(screen.queryByTestId('heo-home-hero')).not.toBeInTheDocument()
    expect(screen.getByTestId('heo-notice').parentElement).toBe(
      container.querySelector('header')
    )
  })

  it('renders the home Hero when the banner is enabled', () => {
    mockConfig.HEO_HOME_BANNER_ENABLE = true

    render(
      <LayoutBase>
        <main>Home</main>
      </LayoutBase>
    )

    expect(screen.getByTestId('heo-home-hero')).toBeInTheDocument()
  })

  it('uses the configured ICP filing link', () => {
    mockConfig.BEI_AN = '测试备案号'
    mockConfig.BEI_AN_LINK = 'https://beian.example.com/custom'

    render(<Footer />)

    expect(screen.getByRole('link', { name: '测试备案号' })).toHaveAttribute(
      'href',
      'https://beian.example.com/custom'
    )
  })
})
