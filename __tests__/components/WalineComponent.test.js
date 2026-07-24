import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
      NOTION_HOST: 'https://img.cdn.619.pp.ua',
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

  it('injects a scoped layout guard for nested Waline replies', async () => {
    fetch.mockResolvedValue({ ok: true })
    init.mockReturnValue({
      update: jest.fn(),
      destroy: jest.fn()
    })

    render(<WalineComponent />)

    await waitFor(() => {
      expect(init).toHaveBeenCalled()
    })

    const styleText = Array.from(document.querySelectorAll('style'))
      .map(style => style.textContent)
      .join('\n')

    expect(styleText).toContain('#waline-comment')
    expect(styleText).toContain('.wl-reply .wl-item')
    expect(styleText).toContain('grid-template-columns')
  })

  it('configures elemecdn before the proxy for emoji and reactions', async () => {
    fetch.mockResolvedValue({ ok: true })
    init.mockReturnValue({
      update: jest.fn(),
      destroy: jest.fn()
    })

    render(<WalineComponent />)

    await waitFor(() => expect(init).toHaveBeenCalled())
    const options = init.mock.calls[0][0]

    expect(options.emoji).toContain(
      'https://npm.elemecdn.com/@waline/emojis@1.2.0/tieba'
    )
    expect(options.reaction[0]).toBe(
      'https://npm.elemecdn.com/@waline/emojis@1.2.0/tieba/tieba_agree.png'
    )
  })

  it('moves failed Waline images to the Worker as the second layer', async () => {
    fetch.mockResolvedValue({ ok: true })
    init.mockReturnValue({
      update: jest.fn(),
      destroy: jest.fn()
    })

    render(<WalineComponent />)
    await waitFor(() => expect(init).toHaveBeenCalled())

    const image = document.createElement('img')
    image.src =
      'https://npm.elemecdn.com/@waline/emojis@1.2.0/tieba/tieba_agree.png'
    document.getElementById('waline-comment').appendChild(image)
    fireEvent.error(image)

    expect(image.src).toBe(
      'https://img.cdn.619.pp.ua/external/waline-emojis/1.2.0/tieba/tieba_agree.png'
    )
  })
})
