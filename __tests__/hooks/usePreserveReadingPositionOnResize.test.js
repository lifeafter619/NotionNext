import { act, render } from '@testing-library/react'
import usePreserveReadingPositionOnResize from '@/hooks/usePreserveReadingPositionOnResize'

function setViewport({ width, height = 900 }) {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: width
  })
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height
  })
}

function TestArticle() {
  usePreserveReadingPositionOnResize('post-a')

  return (
    <article id='notion-article'>
      <div className='notion-block'>Current reading block</div>
    </article>
  )
}

describe('usePreserveReadingPositionOnResize', () => {
  let blockTop
  let blockHeight

  beforeEach(() => {
    jest.useFakeTimers()
    setViewport({ width: 1440 })
    blockTop = 220
    blockHeight = 200

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 1200
    })
    Object.defineProperty(window, 'scrollBy', {
      configurable: true,
      value: jest.fn((left, top) => {
        blockTop -= top
      })
    })
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: callback => window.setTimeout(() => callback(), 0)
    })
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: frameId => window.clearTimeout(frameId)
    })

    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        if (this.classList?.contains('notion-block')) {
          return {
            top: blockTop,
            bottom: blockTop + blockHeight,
            left: 0,
            right: 800,
            width: 800,
            height: blockHeight,
            x: 0,
            y: blockTop,
            toJSON: () => ({})
          }
        }

        return {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({})
        }
      })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('keeps the same article block stable through shrink and maximize reflow', () => {
    render(<TestArticle />)
    act(() => {
      jest.runOnlyPendingTimers()
    })

    blockTop = 420
    blockHeight = 320
    setViewport({ width: 900 })

    act(() => {
      window.dispatchEvent(new Event('resize'))
      jest.runOnlyPendingTimers()
    })

    expect(window.scrollBy).toHaveBeenNthCalledWith(1, 0, 257)
    expect(blockTop).toBe(163)

    blockTop = 80
    blockHeight = 200
    setViewport({ width: 1440 })

    act(() => {
      window.dispatchEvent(new Event('resize'))
      jest.runOnlyPendingTimers()
    })

    expect(window.scrollBy).toHaveBeenNthCalledWith(2, 0, -140)
    expect(blockTop).toBe(220)
  })

  it('does not adjust scroll position for height-only viewport changes', () => {
    render(<TestArticle />)

    blockTop = 80
    setViewport({ width: 1440, height: 700 })

    act(() => {
      window.dispatchEvent(new Event('resize'))
      jest.runOnlyPendingTimers()
    })

    expect(window.scrollBy).not.toHaveBeenCalled()
  })
})
