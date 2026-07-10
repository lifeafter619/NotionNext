import { render } from '@testing-library/react'
import AOSAnimation from '@/components/AOSAnimation'

const routeEvents = {
  on: jest.fn(),
  off: jest.fn()
}

jest.mock('next/router', () => ({
  useRouter: () => ({
    asPath: '/article/example',
    events: routeEvents
  })
}))

jest.mock('@/lib/utils', () => ({
  isBrowser: true,
  loadExternalResource: jest.fn()
}))

describe('AOSAnimation route changes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.AOS = {
      refreshHard: jest.fn()
    }
    window.requestAnimationFrame = jest.fn(callback => {
      callback()
      return 1
    })
    window.requestIdleCallback = jest.fn(() => 1)
    window.cancelIdleCallback = jest.fn()
  })

  afterEach(() => {
    delete window.AOS
    delete window.requestIdleCallback
    delete window.cancelIdleCallback
  })

  it('refreshes after route completion and removes the listener on unmount', () => {
    const { unmount } = render(<AOSAnimation />)

    expect(routeEvents.on).toHaveBeenCalledWith(
      'routeChangeComplete',
      expect.any(Function)
    )

    const routeCompleteHandler = routeEvents.on.mock.calls[0][1]
    routeCompleteHandler()

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(window.AOS.refreshHard).toHaveBeenCalledTimes(1)

    unmount()

    expect(routeEvents.off).toHaveBeenCalledWith(
      'routeChangeComplete',
      routeCompleteHandler
    )
  })
})
