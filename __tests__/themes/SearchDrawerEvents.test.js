import { render } from '@testing-library/react'
import { Router } from 'next/router'
import CommerceSearchDrawer from '@/themes/commerce/components/SearchDrawer'
import HexoSearchDrawer from '@/themes/hexo/components/SearchDrawer'
import MaterySearchDrawer from '@/themes/matery/components/SearchDrawer'
import NextSearchDrawer from '@/themes/next/components/SearchDrawer'

jest.mock('next/router', () => ({
  Router: {
    events: {
      on: jest.fn(),
      off: jest.fn()
    }
  }
}))

jest.mock('@/themes/commerce/components/SearchInput', () => () => null)
jest.mock('@/themes/hexo/components/SearchInput', () => () => null)
jest.mock('@/themes/matery/components/SearchInput', () => () => null)
jest.mock('@/themes/next/components/SearchInput', () => () => null)

describe.each([
  ['commerce', CommerceSearchDrawer],
  ['hexo', HexoSearchDrawer],
  ['matery', MaterySearchDrawer],
  ['next', NextSearchDrawer]
])('%s SearchDrawer route events', (_theme, SearchDrawer) => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('subscribes once across rerenders and unsubscribes on unmount', () => {
    const { rerender, unmount } = render(<SearchDrawer />)

    rerender(<SearchDrawer slot={<div />} />)

    expect(Router.events.on.mock.calls).toHaveLength(1)
    const handler = Router.events.on.mock.calls[0][1]

    unmount()

    expect(Router.events.off.mock.calls).toContainEqual([
      'routeChangeComplete',
      handler
    ])
  })
})
