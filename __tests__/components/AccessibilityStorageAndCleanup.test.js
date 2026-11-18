import { fireEvent, render } from '@testing-library/react'
import Accessibility from '@/components/Accessibility'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => fallback)
}))

describe('Accessibility storage and cleanup', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('keeps rendering when localStorage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(() => render(<Accessibility />)).not.toThrow()
  })

  it('removes injected style, skip link, and keyboard listener on unmount', () => {
    const addEventListener = jest.spyOn(document, 'addEventListener')
    const removeEventListener = jest.spyOn(document, 'removeEventListener')
    const { unmount } = render(<Accessibility />)
    const keydownHandler = addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'keydown'
    )?.[1]

    expect(document.querySelector('.skip-link')).toBeInTheDocument()
    expect(
      document.head.querySelector('[data-accessibility-style="true"]')
    ).toBeInTheDocument()

    unmount()

    fireEvent.keyDown(document, { altKey: true, key: 'h' })
    expect(document.querySelector('.skip-link')).not.toBeInTheDocument()
    expect(document.head.querySelector('[data-accessibility-style]')).toBe(null)
    expect(removeEventListener).toHaveBeenCalledWith('keydown', keydownHandler)
  })
})
