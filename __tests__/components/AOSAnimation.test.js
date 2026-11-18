import { render, waitFor } from '@testing-library/react'
import AOSAnimation from '@/components/AOSAnimation'

let mockAsPath = '/article/example'
const mockLoadExternalResource = jest.fn(() => Promise.resolve())

jest.mock('next/router', () => ({
  useRouter: () => ({ asPath: mockAsPath })
}))

jest.mock('@/lib/utils', () => ({
  isBrowser: true,
  loadExternalResource: (...args) => mockLoadExternalResource(...args)
}))

describe('AOSAnimation route changes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAsPath = '/article/example'
    document.body.innerHTML = "<div data-aos='fade-up'></div>"
    window.AOS = {
      init: jest.fn()
    }
    window.requestIdleCallback = jest.fn(callback => {
      callback()
      return 1
    })
    window.cancelIdleCallback = jest.fn()
  })

  afterEach(() => {
    delete window.AOS
    delete window.requestIdleCallback
    delete window.cancelIdleCallback
  })

  it('uses automatic mutation observation and initializes only once', async () => {
    const { rerender } = render(<AOSAnimation />)

    await waitFor(() => expect(window.AOS.init).toHaveBeenCalledTimes(1))
    expect(window.AOS.init.mock.calls[0][0]).not.toHaveProperty(
      'disableMutationObserver'
    )

    mockAsPath = '/article/next'
    rerender(<AOSAnimation />)

    await waitFor(() =>
      expect(window.requestIdleCallback).toHaveBeenCalledTimes(2)
    )
    expect(window.AOS.init).toHaveBeenCalledTimes(1)
    expect(mockLoadExternalResource).toHaveBeenCalledTimes(2)
  })
})
