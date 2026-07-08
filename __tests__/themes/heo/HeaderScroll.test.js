import { fireEvent, render } from '@testing-library/react'

let mockSlideOverModuleLoadCount = 0
let mockSlideOverRenderCount = 0

jest.mock('next/router', () => ({
  useRouter: () => ({
    asPath: '/article/demo'
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      AUTHOR: 'Author',
      TITLE: 'Title',
      BIO: 'Bio',
      THEME_SWITCH: false
    }
    return config[key] ?? false
  })
}))

jest.mock('@/themes/heo/components/DarkModeButton', () => () => null)
jest.mock('@/themes/heo/components/Logo', () => () => null)
jest.mock('@/themes/heo/components/MenuListTop', () => ({
  MenuListTop: () => null
}))
jest.mock('@/themes/heo/components/RandomPostButton', () => () => null)
jest.mock('@/themes/heo/components/ReadingProgress', () => () => null)
jest.mock('@/themes/heo/components/SearchButton', () => () => null)
jest.mock('@/themes/heo/components/SlideOver', () => {
  mockSlideOverModuleLoadCount += 1
  return {
    __esModule: true,
    default: function SlideOver() {
      mockSlideOverRenderCount += 1
      return <aside data-testid='heo-slide-over'>menu</aside>
    }
  }
})
jest.mock('next/dynamic', () => {
  const React = require('react')
  return loader => {
    function DynamicComponent(props) {
      const source = loader.toString()
      if (!source.includes('SlideOver')) {
        return null
      }
      const mod = require('@/themes/heo/components/SlideOver')
      const LoadedComponent = mod.default || mod
      return React.createElement(LoadedComponent, props)
    }
    DynamicComponent.displayName = 'LoadableComponent'
    DynamicComponent.preload = jest.fn()
    return DynamicComponent
  }
})
jest.mock('styled-jsx/style', () => () => null)

function getHeader() {
  return require('@/themes/heo/components/Header').default
}

describe('heo Header scroll handling', () => {
  beforeEach(() => {
    mockSlideOverModuleLoadCount = 0
    mockSlideOverRenderCount = 0
  })

  it('uses one scroll listener for header state updates', () => {
    const Header = getHeader()
    const addSpy = jest.spyOn(window, 'addEventListener')
    const removeSpy = jest.spyOn(window, 'removeEventListener')

    const { unmount } = render(<Header />)

    expect(
      addSpy.mock.calls.filter(([event]) => event === 'scroll')
    ).toHaveLength(1)

    unmount()

    expect(
      removeSpy.mock.calls.filter(([event]) => event === 'scroll')
    ).toHaveLength(1)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('does not load the mobile drawer module while rendering the header', () => {
    const Header = getHeader()

    render(<Header />)

    expect(mockSlideOverModuleLoadCount).toBe(0)
    expect(mockSlideOverRenderCount).toBe(0)
  })

  it('loads the mobile drawer module only after the menu button is clicked', () => {
    const Header = getHeader()

    const { container, getByTestId } = render(<Header />)
    const menuButton = container.querySelector('.fa-bars')?.parentElement

    expect(menuButton).toBeTruthy()
    fireEvent.click(menuButton)

    expect(mockSlideOverModuleLoadCount).toBe(1)
    expect(getByTestId('heo-slide-over')).toHaveTextContent('menu')
  })
})
