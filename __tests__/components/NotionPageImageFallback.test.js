import { retryImageWithProxyFallback } from '@/components/NotionPage'

jest.mock('react-notion-x', () => ({
  NotionRenderer: () => null
}))

describe('NotionPage image fallback', () => {
  it('retries failed Notion article images through the local image proxy', () => {
    const img = document.createElement('img')
    const source =
      'https://www.notion.so/image/https%3A%2F%2Fgithub.com%2Ffavicon.ico?table=block&id=block-id'
    img.setAttribute('src', source)
    img.setAttribute('srcset', `${source} 1x`)

    const retried = retryImageWithProxyFallback(img)

    expect(retried).toBe(true)
    expect(img.getAttribute('src')).toBe(
      `/api/proxy-image?url=${encodeURIComponent(source)}`
    )
    expect(img.hasAttribute('srcset')).toBe(false)
    expect(img.dataset.notionNextProxyRetried).toBe('true')
  })

  it('does not retry arbitrary prod-files-secure hostnames', () => {
    const img = document.createElement('img')
    const source = 'https://prod-files-secure.evil.example/image.png'
    img.setAttribute('src', source)

    const retried = retryImageWithProxyFallback(img)

    expect(retried).toBe(false)
    expect(img.getAttribute('src')).toBe(source)
    expect(img.dataset.notionNextProxyRetried).toBeUndefined()
  })
})
