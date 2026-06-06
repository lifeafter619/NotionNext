import { render } from '@testing-library/react'
import Header from '@/themes/heo/components/Header'

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
jest.mock('@/themes/heo/components/SlideOver', () => () => null)
jest.mock('styled-jsx/style', () => () => null)

describe('heo Header scroll handling', () => {
  it('uses one scroll listener for header state updates', () => {
    const addSpy = jest.spyOn(window, 'addEventListener')
    const removeSpy = jest.spyOn(window, 'removeEventListener')

    const { unmount } = render(<Header />)

    expect(addSpy.mock.calls.filter(([event]) => event === 'scroll')).toHaveLength(
      1
    )

    unmount()

    expect(
      removeSpy.mock.calls.filter(([event]) => event === 'scroll')
    ).toHaveLength(1)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
