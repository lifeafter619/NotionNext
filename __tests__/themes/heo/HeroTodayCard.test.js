import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Hero from '@/themes/heo/components/Hero'

const mockPush = jest.fn()
const mockSiteConfig = jest.fn()
const originalMatchMedia = window.matchMedia
let mockGroupIcons
let mockCoverEnable

jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: (...args) => mockSiteConfig(...args)
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: {
        RECOMMEND_BADGES: '荐',
        RECOMMEND_POSTS: '查看更多'
      }
    }
  })
}))

jest.mock('@/components/HeroIcons', () => ({
  ArrowSmallRight: props => <svg {...props} />,
  PlusSmall: props => <svg {...props} />
}))

jest.mock('@/components/LazyImage', () => {
  return function MockLazyImage({
    priority,
    fetchPriority: _fetchPriority,
    ...props
  }) {
    return <img data-priority={priority ? 'high' : 'normal'} {...props} />
  }
})

jest.mock('@/themes/heo/components/HeoLink', () => {
  return function MockHeoLink({ href, children, ...props }) {
    return (
      <a href={typeof href === 'string' ? href : '#'} {...props}>
        {children}
      </a>
    )
  }
})

describe('heo Hero today card', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockGroupIcons = []
    mockCoverEnable = true
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })
    mockSiteConfig.mockImplementation((key, defaultValue) => {
      const config = {
        SUB_PATH: '/blog',
        HEO_HERO_RECOMMEND_COVER_ENABLE: mockCoverEnable,
        HEO_HERO_TITLE_LINK: '/featured',
        HEO_GROUP_ICONS: mockGroupIcons,
        HEO_HERO_CATEGORY_1: {},
        HEO_HERO_CATEGORY_2: {},
        HEO_HERO_CATEGORY_3: {}
      }
      return config[key] ?? defaultValue
    })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  function renderHero(props = {}) {
    return render(
      <Hero
        latestPosts={[]}
        allNavPages={[]}
        siteInfo={{ pageCover: '/cover.jpg' }}
        {...props}
      />
    )
  }

  it('keeps the card action and show-more action as separate controls', async () => {
    const user = userEvent.setup()
    renderHero()

    const openPostButton = screen.getByRole('button', {
      name: '打开推荐文章'
    })
    const showMoreButton = screen.getByRole('button', { name: '查看更多' })

    expect(openPostButton).not.toContainElement(showMoreButton)
    expect(showMoreButton).not.toContainElement(openPostButton)

    await user.click(showMoreButton)

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('opens the configured recommendation through SUB_PATH', async () => {
    const user = userEvent.setup()
    renderHero()

    await user.click(
      screen.getByRole('button', { name: '打开推荐文章' })
    )

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/blog/featured')
  })

  it('does not create desktop decoration image requests on mobile', () => {
    mockGroupIcons = [
      {
        img_1: '/desktop-one.png',
        title_1: 'Desktop one',
        img_2: '/desktop-two.png',
        title_2: 'Desktop two'
      }
    ]
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })

    renderHero()

    expect(screen.queryByAltText('Desktop one')).not.toBeInTheDocument()
    expect(screen.queryByAltText('Desktop two')).not.toBeInTheDocument()
    expect(screen.queryByAltText('Today Card Cover')).not.toBeInTheDocument()
  })

  it('renders the decoration images on desktop', async () => {
    mockGroupIcons = [
      {
        img_1: '/desktop-one.png',
        title_1: 'Desktop one',
        img_2: '/desktop-two.png',
        title_2: 'Desktop two'
      }
    ]
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })

    renderHero()

    expect(await screen.findAllByAltText('Desktop one')).toHaveLength(2)
    expect(await screen.findAllByAltText('Desktop two')).toHaveLength(2)
  })

  it('loads only the first recommended cover eagerly', () => {
    renderHero({
      latestPosts: [
        {
          id: 'post-1',
          href: '/post-1',
          title: 'First recommendation',
          pageCoverThumbnail: '/first.jpg'
        },
        {
          id: 'post-2',
          href: '/post-2',
          title: 'Second recommendation',
          pageCoverThumbnail: '/second.jpg'
        }
      ]
    })

    expect(screen.getByAltText('First recommendation')).toHaveAttribute(
      'loading',
      'eager'
    )
    expect(screen.getByAltText('Second recommendation')).not.toHaveAttribute(
      'loading'
    )
  })

  it('keeps only the visible today cover at high priority', () => {
    renderHero({
      latestPosts: [
        {
          id: 'post-1',
          href: '/post-1',
          title: 'First recommendation',
          pageCoverThumbnail: '/first.jpg'
        }
      ]
    })

    expect(screen.getByAltText('Today Card Cover')).toHaveAttribute(
      'data-priority',
      'high'
    )
    expect(screen.getByAltText('First recommendation')).toHaveAttribute(
      'data-priority',
      'normal'
    )
  })

  it('transfers high priority to the first recommendation without today cover', () => {
    mockCoverEnable = false
    renderHero({
      latestPosts: [
        {
          id: 'post-1',
          href: '/post-1',
          title: 'First recommendation',
          pageCoverThumbnail: '/first.jpg'
        }
      ]
    })

    expect(screen.queryByAltText('Today Card Cover')).not.toBeInTheDocument()
    expect(screen.getByAltText('First recommendation')).toHaveAttribute(
      'data-priority',
      'high'
    )
  })
})
