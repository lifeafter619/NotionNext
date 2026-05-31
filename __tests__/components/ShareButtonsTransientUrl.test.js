import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ShareButtons from '@/components/ShareButtons'

let writeTextMock

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      LINK: 'https://blog.example.com',
      POSTS_SHARE_SERVICES: 'link',
      TITLE: 'Test Site'
    }
    return config[key] ?? ''
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: {
        URL_COPIED: 'Copied',
        SCAN_QR_CODE: 'Scan'
      }
    }
  })
}))

describe('ShareButtons transient URL cleanup', () => {
  beforeEach(() => {
    writeTextMock = jest.fn()
    window.history.pushState(
      {},
      '',
      '/post/foo?giscus=abc&x=1&target=comment#intro'
    )
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock
      }
    })
    window.alert = jest.fn()
  })

  it('copies the canonical page URL without transient callback params', async () => {
    render(
      <ShareButtons
        post={{
          title: 'Post',
          summary: 'Summary',
          tags: []
        }}
      />
    )

    fireEvent.click(screen.getByLabelText('link'))

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        'http://localhost/post/foo?x=1#intro'
      )
    })
  })
})
