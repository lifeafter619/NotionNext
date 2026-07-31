import { act, render } from '@testing-library/react'
import Artalk from '@/components/Artalk'
import { loadExternalResource } from '@/lib/utils'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      COMMENT_ARTALK_CSS: 'https://example.com/artalk.css',
      COMMENT_ARTALK_SERVER: 'https://comments.example.com',
      LANG: 'en-US',
      TITLE: 'Test Site'
    }
    return config[key]
  })
}))

jest.mock('@/lib/utils', () => ({
  loadExternalResource: jest.fn()
}))

describe('Artalk lifecycle', () => {
  const observers = []

  beforeEach(() => {
    observers.length = 0
    global.MutationObserver = class MockMutationObserver {
      constructor() {
        this.observe = jest.fn()
        this.disconnect = jest.fn()
        observers.push(this)
      }
    }
    window.Artalk = {
      init: jest.fn(() => ({ setDarkMode: jest.fn() }))
    }
    loadExternalResource.mockResolvedValue(undefined)
  })

  it('disconnects its theme observer when unmounted', async () => {
    const { unmount } = render(<Artalk />)

    await act(async () => {})
    expect(window.Artalk.init).toHaveBeenCalledTimes(1)
    expect(observers).toHaveLength(1)
    unmount()

    expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  })

  it('does not initialize after an in-flight resource load is unmounted', async () => {
    let finishLoading
    loadExternalResource.mockImplementation(
      () => new Promise(resolve => (finishLoading = resolve))
    )
    const { unmount } = render(<Artalk />)

    unmount()
    finishLoading()
    await Promise.resolve()
    await Promise.resolve()

    expect(window.Artalk.init).not.toHaveBeenCalled()
    expect(observers).toHaveLength(0)
  })
})
