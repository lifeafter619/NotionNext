import { render, screen, waitFor } from '@testing-library/react'
import { LayoutBase } from '@/themes/gitbook'

const mockRouter = {
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  push: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn()
  }
}

jest.mock('@/components/Comment', () => () => null)
jest.mock('@/components/GoogleAdsense', () => ({
  AdSlot: () => null
}))
jest.mock('@/components/Live2D', () => () => null)
jest.mock('@/components/LoadingCover', () => () => null)
jest.mock('@/components/NotionIcon', () => () => null)
jest.mock('@/components/NotionPage', () => () => null)
jest.mock('@/components/ShareBar', () => () => null)
jest.mock('@/components/ui/dashboard/DashboardBody', () => () => null)
jest.mock('@/components/ui/dashboard/DashboardHeader', () => () => null)
jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => fallback)
}))
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ fullWidth: false })
}))
jest.mock('next/router', () => ({
  useRouter: () => mockRouter
}))
jest.mock('@clerk/nextjs', () => ({
  SignIn: () => null,
  SignUp: () => null
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
jest.mock('@/themes/gitbook/components/Announcement', () => () => null)
jest.mock('@/themes/gitbook/components/ArticleInfo', () => () => null)
jest.mock('@/themes/gitbook/components/BottomMenuBar', () => () => null)
jest.mock('@/themes/gitbook/components/Catalog', () => () => null)
jest.mock('@/themes/gitbook/components/Footer', () => () => null)
jest.mock('@/themes/gitbook/components/Header', () => () => null)
jest.mock('@/themes/gitbook/components/InfoCard', () => () => null)
jest.mock('@/themes/gitbook/components/JumpToTopButton', () => () => null)
jest.mock('@/themes/gitbook/components/NavPostList', () => () => null)
jest.mock('@/themes/gitbook/components/PageNavDrawer', () => () => null)
jest.mock('@/themes/gitbook/components/RevolverMaps', () => () => null)
jest.mock('@/themes/gitbook/style', () => ({
  Style: () => null
}))

describe('Gitbook post read time storage', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('ignores corrupted post_read_time data when marking latest pages', async () => {
    const getItem = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue('{bad json')
    const setItem = jest.spyOn(Storage.prototype, 'setItem')

    const post = {
      id: '00000000000000abcdef1234567890',
      title: 'Current post'
    }
    const navPage = {
      short_id: 'abcdef1234567890',
      title: 'Current post',
      slug: 'current-post',
      href: '/current-post',
      lastEditedDate: '2025-01-01T00:00:00.000Z'
    }

    render(
      <LayoutBase
        post={post}
        allNavPages={[navPage]}
        latestPosts={[post]}
        slotLeft={null}
        slotRight={null}
        slotTop={null}>
        <div>content</div>
      </LayoutBase>
    )

    await waitFor(() => {
      expect(setItem).toHaveBeenCalledWith(
        'post_read_time',
        expect.stringContaining('abcdef1234567890')
      )
    })
  })

  it('keeps rendering when post_read_time storage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    const post = {
      id: '00000000000000abcdef1234567890',
      title: 'Current post'
    }
    const navPage = {
      short_id: 'abcdef1234567890',
      title: 'Current post',
      slug: 'current-post',
      href: '/current-post',
      lastEditedDate: '2025-01-01T00:00:00.000Z'
    }

    expect(() => {
      render(
        <LayoutBase
          post={post}
          allNavPages={[navPage]}
          latestPosts={[post]}
          slotLeft={null}
          slotRight={null}
          slotTop={null}>
          <div>content</div>
        </LayoutBase>
      )
    }).not.toThrow()

    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
