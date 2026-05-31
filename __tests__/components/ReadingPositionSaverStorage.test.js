import { act, fireEvent, render } from '@testing-library/react'
import ReadingPositionSaver from '@/components/ReadingPositionSaver'

describe('ReadingPositionSaver storage handling', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 300
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800
    })
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('does not throw when saving the reading position fails', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    render(<ReadingPositionSaver postId='post-1' />)
    fireEvent.scroll(window)

    expect(() => {
      act(() => {
        jest.advanceTimersByTime(1000)
      })
    }).not.toThrow()
  })

  it('does not throw when clearing a restored reading position fails', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({
        position: 320,
        percentage: 50,
        timestamp: Date.now()
      })
    )
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    render(<ReadingPositionSaver postId='post-1' />)

    expect(() => {
      act(() => {
        jest.advanceTimersByTime(500)
      })
    }).not.toThrow()
  })
})
