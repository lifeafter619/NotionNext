import { act, render, screen, waitFor } from '@testing-library/react'
import WalineComponent from '@/components/WalineComponent'
import { init } from '@waline/client'

jest.mock('@waline/client/style', () => ({}))

jest.mock('@waline/client', () => ({
  init: jest.fn()
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      COMMENT_WALINE_SERVER_URL: 'https://comments.example.com',
      LANG: 'zh-CN'
    }
    return config[key]
  })
}))

jest.mock('next/router', () => ({
  useRouter: () => ({
    events: {
      on: jest.fn(),
      off: jest.fn()
    }
  })
}))

describe('WalineComponent', () => {
  it('renders a fallback instead of throwing when Waline init fails', async () => {
    init.mockImplementation(() => {
      throw new TypeError('Failed to fetch')
    })

    render(<WalineComponent />)

    expect(
      await screen.findByText('评论服务暂时不可用，请稍后再试。')
    ).toBeInTheDocument()
  })

  it('handles async Waline fetch rejections before they reach the page', async () => {
    init.mockReturnValue({
      update: jest.fn(),
      destroy: jest.fn()
    })

    render(<WalineComponent />)

    const event = new Event('unhandledrejection', { cancelable: true })
    const walineError = new TypeError('Failed to fetch')
    Object.defineProperty(walineError, 'stack', {
      value: 'TypeError: Failed to fetch\n    at request (@waline/client)'
    })
    Object.defineProperty(event, 'reason', {
      value: walineError
    })

    act(() => {
      window.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(true)
    expect(
      await screen.findByText('评论服务暂时不可用，请稍后再试。')
    ).toBeInTheDocument()
  })

  it('does not handle unrelated page fetch failures as Waline failures', async () => {
    fetch.mockResolvedValue({ ok: true })
    init.mockReturnValue({
      update: jest.fn(),
      destroy: jest.fn()
    })

    render(<WalineComponent />)

    await waitFor(() => {
      expect(init).toHaveBeenCalled()
    })

    const event = new Event('unhandledrejection', { cancelable: true })
    Object.defineProperty(event, 'reason', {
      value: new TypeError('Failed to fetch')
    })

    act(() => {
      window.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(false)
    expect(
      screen.queryByText('评论服务暂时不可用，请稍后再试。')
    ).not.toBeInTheDocument()
  })

  it('does not initialize Waline when the comment server preflight fails', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    render(<WalineComponent />)

    expect(
      await screen.findByText('评论服务暂时不可用，请稍后再试。')
    ).toBeInTheDocument()
    expect(init).not.toHaveBeenCalled()
  })

  it('turns Waline API fetch failures into the fallback state', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    init.mockImplementation(() => {
      window.fetch('https://comments.example.com/api/comment')
      return {
        update: jest.fn(),
        destroy: jest.fn()
      }
    })

    render(<WalineComponent />)

    expect(
      await screen.findByText('评论服务暂时不可用，请稍后再试。')
    ).toBeInTheDocument()
  })
})
