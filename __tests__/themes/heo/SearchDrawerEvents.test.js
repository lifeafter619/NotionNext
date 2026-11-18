import { render } from '@testing-library/react'
import { Router } from 'next/router'
import SearchDrawer from '@/themes/heo/components/SearchDrawer'

jest.mock('next/router', () => ({
  Router: {
    events: {
      on: jest.fn(),
      off: jest.fn()
    }
  }
}))

jest.mock('@/themes/heo/components/SearchInput', () => {
  return function SearchInput() {
    return <input aria-label='search' />
  }
})

describe('heo SearchDrawer route events', () => {
  const mockRouteEvents = Router.events

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('registers route completion once and removes it on unmount', () => {
    const { rerender, unmount } = render(<SearchDrawer />)

    rerender(<SearchDrawer slot={<div />} />)

    expect(mockRouteEvents.on).toHaveBeenCalledTimes(1)
    expect(mockRouteEvents.on).toHaveBeenCalledWith(
      'routeChangeComplete',
      expect.any(Function)
    )

    const routeCompleteHandler = mockRouteEvents.on.mock.calls[0][1]

    unmount()

    expect(mockRouteEvents.off).toHaveBeenCalledWith(
      'routeChangeComplete',
      routeCompleteHandler
    )
  })
})
