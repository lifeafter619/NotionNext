import { render, screen, waitFor } from '@testing-library/react'
import SlideOver from '@/themes/heo/components/SlideOver'

const mockSlideOverConfig = {
  HEO_WIDGET_DARK_MODE: true
}

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    asPath: '/article/demo'
  })
}))

jest.mock('@headlessui/react', () => {
  function Dialog({ children }) {
    return <div role='dialog'>{children}</div>
  }
  function DialogPanel({ children }) {
    return <div>{children}</div>
  }
  function TransitionRoot({ show, children }) {
    return show ? <>{children}</> : null
  }
  function TransitionChild({ children }) {
    return <>{children}</>
  }

  Dialog.Panel = DialogPanel

  return {
    Dialog,
    Transition: {
      Root: TransitionRoot,
      Child: TransitionChild
    }
  }
})

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    isDarkMode: false,
    toggleDarkMode: jest.fn(),
    locale: {
      COMMON: {
        BLOG: 'Blog',
        TAGS: 'Tags'
      },
      MENU: {
        DARK_MODE: 'Dark mode',
        LIGHT_MODE: 'Light mode'
      }
    }
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) =>
    Object.prototype.hasOwnProperty.call(mockSlideOverConfig, key)
      ? mockSlideOverConfig[key]
      : defaultValue
  )
}))

jest.mock('@/components/DarkModeButton', () => {
  return function DarkModeButton() {
    return null
  }
})
jest.mock('@/components/SmartLink', () => {
  return function SmartLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})
jest.mock('@/themes/heo/components/MenuListSide', () => ({
  MenuListSide: function MenuListSide() {
    return <nav>Side links</nav>
  }
}))
jest.mock('@/themes/heo/components/TagGroups', () => {
  return function TagGroups() {
    return <div>Tag list</div>
  }
})

describe('heo SlideOver open signal', () => {
  beforeEach(() => {
    mockSlideOverConfig.HEO_WIDGET_DARK_MODE = true
  })

  it('opens on first mount when the header click increments openSignal', async () => {
    render(
      <SlideOver cRef={{ current: null }} openSignal={1} tagOptions={[]} />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getByText('Side links')).toBeInTheDocument()
  })

  it('hides the mobile dark mode control when the widget is disabled', async () => {
    mockSlideOverConfig.HEO_WIDGET_DARK_MODE = false
    render(
      <SlideOver cRef={{ current: null }} openSignal={1} tagOptions={[]} />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.queryByText('Dark mode')).not.toBeInTheDocument()
  })
})
