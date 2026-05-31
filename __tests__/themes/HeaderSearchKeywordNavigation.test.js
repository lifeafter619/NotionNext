import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SimpleNavBar from '@/themes/simple/components/NavBar'
import MagzineHeader from '@/themes/magzine/components/Header'
import { Header as MovieHeader } from '@/themes/movie/components/Header'

const mockRouterPush = jest.fn()
const openSearch = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    query: {},
    push: mockRouterPush
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      TITLE: 'Test Site',
      CUSTOM_MENU: false,
      SIMPLE_MENU_SEARCH: true,
      MOVIE_MENU_INDEX: true,
      MOVIE_MENU_SEARCH: true,
      MOVIE_MENU_ARCHIVE: true
    }
    return config[key] ?? false
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      NAV: {
        INDEX: 'Home',
        SEARCH: 'Search',
        ARCHIVE: 'Archive'
      },
      COMMON: {
        CATEGORY: 'Category',
        TAGS: 'Tags',
        SEARCH: 'Search',
        SIGN_IN: 'Sign in'
      }
    }
  })
}))

jest.mock('@/lib/plugins/algoliaConfig', () => ({
  isAlgoliaSearchEnabled: jest.fn(() => false)
}))

jest.mock('@/components/SmartLink', () => {
  return function SmartLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

jest.mock('@/components/Collapse', () => {
  return function Collapse({ children }) {
    return <div>{children}</div>
  }
})

jest.mock('@/components/DarkModeButton', () => () => null)
jest.mock('@/components/ClerkAuthState', () => ({
  SignedIn: ({ children }) => <>{children}</>,
  SignedOut: ({ children }) => <>{children}</>
}))
jest.mock('@clerk/nextjs', () => ({
  SignInButton: ({ children }) => <>{children}</>,
  UserButton: () => null
}))
jest.mock('@/components/ui/dashboard/DashboardButton', () => () => null)

jest.mock('@/themes/simple', () => ({
  useSimpleGlobal: () => ({
    searchModal: { current: { openSearch } }
  })
}))
jest.mock('@/themes/simple/components/MenuList', () => ({
  MenuList: () => null
}))

jest.mock('@/themes/magzine', () => ({
  useMagzineGlobal: () => ({
    searchModal: { current: { openSearch } }
  })
}))
jest.mock('@/themes/magzine/components/LogoBar', () => () => null)
jest.mock('@/themes/magzine/components/MenuBarMobile', () => ({
  MenuBarMobile: () => null
}))
jest.mock('@/themes/magzine/components/MenuItemDrop', () => ({
  MenuItemDrop: () => null
}))

jest.mock('@/themes/movie', () => ({
  useMovieGlobal: () => ({
    collapseRef: { current: { updateCollapseHeight: jest.fn() } },
    searchModal: { current: { openSearch } }
  })
}))
jest.mock('@/themes/movie/components/MenuItemCollapse', () => ({
  MenuItemCollapse: () => null
}))
jest.mock('@/themes/movie/components/MenuItemDrop', () => ({
  MenuItemDrop: () => null
}))

describe('theme header search keyword navigation', () => {
  beforeEach(() => {
    mockRouterPush.mockClear()
    mockRouterPush.mockResolvedValue(true)
    openSearch.mockClear()
  })

  const expectEncodedSearchNavigation = async () => {
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: '/search/hello%20%E4%B8%96%E7%95%8C'
      })
    })
  }

  it('encodes keywords submitted from the Simple theme nav search', async () => {
    const { container } = render(
      <SimpleNavBar customNav={[]} customMenu={[]} />
    )

    fireEvent.click(container.querySelector('.fa-magnifying-glass'))
    const input = screen.getByLabelText('Submit search')
    fireEvent.change(input, { target: { value: 'hello 世界' } })
    fireEvent.keyUp(input, { key: 'Enter', keyCode: 13 })

    await expectEncodedSearchNavigation()
  })

  it('encodes keywords submitted from the Magzine theme header search', async () => {
    const { container } = render(
      <MagzineHeader customNav={[]} customMenu={[]} />
    )

    fireEvent.click(container.querySelector('.fa-magnifying-glass'))
    const input = screen.getByLabelText('Submit search')
    fireEvent.change(input, { target: { value: 'hello 世界' } })
    fireEvent.keyUp(input, { key: 'Enter', keyCode: 13 })

    await expectEncodedSearchNavigation()
  })

  it('encodes keywords submitted from the Movie theme header search', async () => {
    render(<MovieHeader customNav={[]} customMenu={[]} />)

    const input = screen.getByLabelText('Submit search')
    fireEvent.change(input, { target: { value: 'hello 世界' } })
    fireEvent.keyUp(input, { key: 'Enter', keyCode: 13 })

    await expectEncodedSearchNavigation()
  })
})
