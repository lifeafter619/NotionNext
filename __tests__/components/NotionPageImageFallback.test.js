import {
  proxyNotionVideoUrls,
  retryImageWithProxyFallback
} from '@/components/NotionPage'

jest.mock('react-notion-x', () => ({
  NotionRenderer: () => null
}))

describe('NotionPage image fallback', () => {
  it('restores the original Notion image when the configured proxy fails', () => {
    const img = document.createElement('img')
    const source =
      'https://img.cdn.619.pp.ua/image/https%3A%2F%2Fimages.unsplash.com%2Fphoto.jpg?width=800'
    img.setAttribute('src', source)
    img.setAttribute('srcset', `${source} 1x`)

    const retried = retryImageWithProxyFallback(
      img,
      'https://img.cdn.619.pp.ua'
    )

    expect(retried).toBe(true)
    expect(img.getAttribute('src')).toBe(
      'https://www.notion.so/image/https%3A%2F%2Fimages.unsplash.com%2Fphoto.jpg?width=800'
    )
    expect(img.hasAttribute('srcset')).toBe(false)
    expect(img.dataset.notionNextOriginRetried).toBe('true')
    expect(img.dataset.notionNextProxyRetried).toBeUndefined()
  })

  it('falls back to the local proxy if the restored original also fails', () => {
    const img = document.createElement('img')
    const original =
      'https://www.notion.so/image/https%3A%2F%2Fimages.unsplash.com%2Fphoto.jpg?width=800'
    img.setAttribute(
      'src',
      'https://img.cdn.619.pp.ua/image/https%3A%2F%2Fimages.unsplash.com%2Fphoto.jpg?width=800'
    )

    expect(retryImageWithProxyFallback(img, 'https://img.cdn.619.pp.ua')).toBe(
      true
    )
    expect(img.getAttribute('src')).toBe(original)

    expect(retryImageWithProxyFallback(img, 'https://img.cdn.619.pp.ua')).toBe(
      true
    )
    expect(img.getAttribute('src')).toBe(
      `/api/proxy-image?url=${encodeURIComponent(original)}`
    )
    expect(img.dataset.notionNextProxyRetried).toBe('true')
    expect(retryImageWithProxyFallback(img, 'https://img.cdn.619.pp.ua')).toBe(
      false
    )
  })

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

describe('NotionPage video proxy', () => {
  it('replaces temporary signed video URLs with the stable Worker URL', () => {
    const stableSource =
      'https://notion.so/signed/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2Fvideo-id%2Fmovie.mp4?table=block&id=video-block'
    const recordMap = {
      block: {
        'video-block': {
          value: {
            id: 'video-block',
            type: 'video',
            properties: { source: [[stableSource]] }
          }
        },
        'image-block': {
          value: {
            id: 'image-block',
            type: 'image',
            properties: { source: [['https://example.com/image.png']] }
          }
        }
      },
      signed_urls: {
        'video-block': 'https://file.notion.so/temporary-video-url',
        'image-block': 'https://file.notion.so/temporary-image-url'
      }
    }

    const result = proxyNotionVideoUrls(recordMap, 'https://img.cdn.619.pp.ua')

    expect(result.signed_urls['video-block']).toBe(
      'https://img.cdn.619.pp.ua/signed/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2Fvideo-id%2Fmovie.mp4?table=block&id=video-block'
    )
    expect(result.signed_urls['image-block']).toBe(
      'https://file.notion.so/temporary-image-url'
    )
    expect(recordMap.signed_urls['video-block']).toBe(
      'https://file.notion.so/temporary-video-url'
    )
  })
})
