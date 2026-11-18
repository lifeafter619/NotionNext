import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CustomContextMenu from '@/components/CustomContextMenu'

let writeTextMock
let mockSiteConfigValues = {}

jest.mock('@/hooks/useWindowSize', () => () => ({
  width: 1024,
  height: 768
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

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    return mockSiteConfigValues[key] ?? false
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    isDarkMode: false,
    updateDarkMode: jest.fn(),
    locale: {
      MENU: {
        WALK_AROUND: 'Random post',
        SHARE_URL: 'Share URL'
      },
      COMMON: {
        PAGE_URL_COPIED: 'Copied page URL'
      }
    }
  })
}))

describe('CustomContextMenu transient URL cleanup', () => {
  beforeEach(() => {
    mockSiteConfigValues = {
      CUSTOM_RIGHT_CLICK_CONTEXT_MENU_RANDOM_POST: false,
      CUSTOM_RIGHT_CLICK_CONTEXT_MENU_CATEGORY: false,
      CUSTOM_RIGHT_CLICK_CONTEXT_MENU_TAG: false,
      CAN_COPY: false,
      CUSTOM_RIGHT_CLICK_CONTEXT_MENU_SHARE_LINK: true,
      CUSTOM_RIGHT_CLICK_CONTEXT_MENU_DARK_MODE: false,
      CUSTOM_RIGHT_CLICK_CONTEXT_MENU_THEME_SWITCH: false
    }
    writeTextMock = jest.fn().mockResolvedValue(undefined)
    window.history.pushState(
      {},
      '',
      '/post/foo?giscus=abc&x=1&target=comment#intro'
    )
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock
      }
    })
    window.alert = jest.fn()
  })

  it('copies the current page URL without transient callback params', async () => {
    render(<CustomContextMenu allNavPages={[]} />)

    fireEvent.contextMenu(window, { clientX: 10, clientY: 10 })
    fireEvent.click(screen.getByText('Share URL'))

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        'http://localhost/post/foo?x=1#intro'
      )
    })
  })

  it('hides random post action when navigation pages are not available', () => {
    mockSiteConfigValues.CUSTOM_RIGHT_CLICK_CONTEXT_MENU_RANDOM_POST = true
    mockSiteConfigValues.CUSTOM_RIGHT_CLICK_CONTEXT_MENU_SHARE_LINK = false

    render(<CustomContextMenu />)

    fireEvent.contextMenu(window, { clientX: 10, clientY: 10 })

    expect(screen.queryByText('Random post')).not.toBeInTheDocument()
  })
})
