import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Hero from '@/themes/heo/components/Hero'

const mockPush = jest.fn()
const mockSiteConfig = jest.fn()

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
  return function MockLazyImage({ priority: _priority, ...props }) {
    return <img {...props} />
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
    mockSiteConfig.mockImplementation((key, defaultValue) => {
      const config = {
        SUB_PATH: '/blog',
        HEO_HERO_RECOMMEND_COVER_ENABLE: true,
        HEO_HERO_TITLE_LINK: '/featured',
        HEO_GROUP_ICONS: [],
        HEO_HERO_CATEGORY_1: {},
        HEO_HERO_CATEGORY_2: {},
        HEO_HERO_CATEGORY_3: {}
      }
      return config[key] ?? defaultValue
    })
  })

  function renderHero() {
    return render(
      <Hero
        latestPosts={[]}
        allNavPages={[]}
        siteInfo={{ pageCover: '/cover.jpg' }}
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
})
