import { fireEvent, render, screen } from '@testing-library/react'
import FuwariHeader from '@/themes/fuwari/components/Header'
import { Header as ThoughtliteHeader } from '@/themes/thoughtlite/components/Header'

const mockRouterPush = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    query: {},
    push: mockRouterPush
  })
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

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    isDarkMode: false,
    toggleDarkMode: jest.fn(),
    locale: {
      NAV: { SEARCH: 'Search', ARCHIVE: 'Archive' },
      COMMON: { CATEGORY: 'Category', TAGS: 'Tags' }
    }
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      TITLE: 'Test Site',
      THOUGHTLITE_MENU_SEARCH: true,
      FUWARI_THEME_COLOR_FIXED: true,
      ALGOLIA_APP_ID: null,
      ALGOLIA_SEARCH_ONLY_APP_KEY: null,
      ALGOLIA_INDEX: null,
      CUSTOM_MENU: false
    }
    return config[key] ?? null
  })
}))

jest.mock('@/themes/fuwari/components/MenuList', () => () => null)
jest.mock('@/themes/fuwari/components/MobileNav', () => () => null)
jest.mock('@/themes/fuwari/components/ThemeColorSwitch', () => () => null)
jest.mock('@/themes/thoughtlite/components/MenuList', () => ({
  MenuList: () => null
}))

describe('theme header search navigation', () => {
  beforeEach(() => {
    mockRouterPush.mockClear()
  })

  it('uses client-side navigation from the Fuwari search button', () => {
    render(<FuwariHeader locale={{}} customNav={[]} customMenu={[]} />)

    fireEvent.click(screen.getAllByRole('button')[0])

    expect(mockRouterPush).toHaveBeenCalledWith('/search')
  })

  it('uses client-side navigation from the Thoughtlite search button', () => {
    render(<ThoughtliteHeader customNav={[]} customMenu={[]} />)

    fireEvent.click(screen.getByLabelText('Search'))

    expect(mockRouterPush).toHaveBeenCalledWith('/search')
  })
})
