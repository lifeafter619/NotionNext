import {
  proxyNotionVideoUrls,
  retryImageWithProxyFallback
} from '@/components/NotionPage'

jest.mock('react-notion-x', () => ({
  NotionRenderer: () => null
}))

describe('NotionPage image fallback', () => {
  it('unwraps an external image from a legacy configured-proxy URL', () => {
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
      'https://images.unsplash.com/photo.jpg'
    )
    expect(img.hasAttribute('srcset')).toBe(false)
    expect(img.dataset.notionNextOriginRetried).toBe('true')
    expect(img.dataset.notionNextProxyRetried).toBeUndefined()
  })

  it('never sends an unwrapped external image through the local proxy', () => {
    const img = document.createElement('img')
    img.setAttribute(
      'src',
      'https://img.cdn.619.pp.ua/image/https%3A%2F%2Fimages.unsplash.com%2Fphoto.jpg?width=800'
    )

    expect(retryImageWithProxyFallback(img, 'https://img.cdn.619.pp.ua')).toBe(
      true
    )
    expect(img.getAttribute('src')).toBe(
      'https://images.unsplash.com/photo.jpg'
    )

    expect(retryImageWithProxyFallback(img, 'https://img.cdn.619.pp.ua')).toBe(
      true
    )
    expect(img.getAttribute('src')).toBe(
      'https://images.unsplash.com/photo.jpg'
    )
    expect(img.referrerPolicy).toBe('no-referrer')
    expect(img.dataset.notionNextNoReferrerRetried).toBe('true')
    expect(img.dataset.notionNextProxyRetried).toBeUndefined()

    expect(retryImageWithProxyFallback(img, 'https://img.cdn.619.pp.ua')).toBe(
      false
    )
  })

  it('retries a failed third-party image directly without a referrer', () => {
    const img = document.createElement('img')
    const source = 'https://image.66619.eu.org/file/example.png'
    img.setAttribute('src', source)
    img.setAttribute('srcset', `${source} 1x`)

    expect(retryImageWithProxyFallback(img, 'https://img.cdn.619.pp.ua')).toBe(
      true
    )
    expect(img.getAttribute('src')).toBe(source)
    expect(img.hasAttribute('srcset')).toBe(false)
    expect(img.referrerPolicy).toBe('no-referrer')
    expect(img.dataset.notionNextNoReferrerRetried).toBe('true')
    expect(img.dataset.notionNextProxyRetried).toBeUndefined()

    expect(retryImageWithProxyFallback(img, 'https://img.cdn.619.pp.ua')).toBe(
      false
    )
  })

  it('unwraps a third-party image from a Notion image URL', () => {
    const img = document.createElement('img')
    const source =
      'https://www.notion.so/image/https%3A%2F%2Fgithub.com%2Ffavicon.ico?table=block&id=block-id'
    img.setAttribute('src', source)
    img.setAttribute('srcset', `${source} 1x`)

    const retried = retryImageWithProxyFallback(img)

    expect(retried).toBe(true)
    expect(img.getAttribute('src')).toBe('https://github.com/favicon.ico')
    expect(img.hasAttribute('srcset')).toBe(false)
    expect(img.dataset.notionNextProxyRetried).toBeUndefined()
  })

  it('retries failed Notion attachment images through the local proxy', () => {
    const img = document.createElement('img')
    const source =
      'https://www.notion.so/image/attachment%3Aimage-id%3Acover.png?table=block&id=block-id'
    img.setAttribute('src', source)

    expect(retryImageWithProxyFallback(img)).toBe(true)
    expect(img.getAttribute('src')).toBe(
      `/api/proxy-image?url=${encodeURIComponent(source)}`
    )
    expect(img.dataset.notionNextProxyRetried).toBe('true')
  })

  it('does not proxy arbitrary prod-files-secure hostnames', () => {
    const img = document.createElement('img')
    const source = 'https://prod-files-secure.evil.example/image.png'
    img.setAttribute('src', source)

    const retried = retryImageWithProxyFallback(img)

    expect(retried).toBe(true)
    expect(img.getAttribute('src')).toBe(source)
    expect(img.referrerPolicy).toBe('no-referrer')
    expect(img.dataset.notionNextNoReferrerRetried).toBe('true')
    expect(img.dataset.notionNextProxyRetried).toBeUndefined()

    expect(retryImageWithProxyFallback(img)).toBe(false)
  })
})

describe('NotionPage media proxy', () => {
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

  it('keeps externally hosted videos on their original signed URL', () => {
    const recordMap = {
      block: {
        'video-block': {
          value: {
            id: 'video-block',
            type: 'video',
            properties: {
              source: [
                [
                  'https://s3-us-west-2.amazonaws.com/my-public-bucket/movie.mp4'
                ]
              ]
            }
          }
        }
      },
      signed_urls: {
        'video-block':
          'https://s3-us-west-2.amazonaws.com/my-public-bucket/movie.mp4'
      }
    }

    const result = proxyNotionVideoUrls(recordMap, 'https://img.cdn.619.pp.ua')

    expect(result).toBe(recordMap)
    expect(result.signed_urls['video-block']).toBe(
      'https://s3-us-west-2.amazonaws.com/my-public-bucket/movie.mp4'
    )
  })

  it('replaces temporary signed Notion audio URLs with the stable Worker URL', () => {
    const stableSource =
      'https://notion.so/signed/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Faudio-id%2Fpodcast.mp3?table=block&id=audio-block'
    const recordMap = {
      block: {
        'audio-block': {
          value: {
            id: 'audio-block',
            type: 'audio',
            properties: { source: [[stableSource]] }
          }
        }
      },
      signed_urls: {
        'audio-block':
          'https://file.notion.so/temporary-audio-url?expirationTimestamp=1'
      }
    }

    const result = proxyNotionVideoUrls(recordMap, 'https://img.cdn.619.pp.ua')

    expect(result.signed_urls['audio-block']).toBe(
      'https://img.cdn.619.pp.ua/signed/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Faudio-id%2Fpodcast.mp3?table=block&id=audio-block'
    )
    expect(recordMap.signed_urls['audio-block']).toBe(
      'https://file.notion.so/temporary-audio-url?expirationTimestamp=1'
    )
  })

  it('keeps externally hosted audio on its original URL', () => {
    const source = 'https://media.example.com/podcast.mp3?token=original'
    const recordMap = {
      block: {
        'audio-block': {
          value: {
            id: 'audio-block',
            type: 'audio',
            properties: { source: [[source]] }
          }
        }
      },
      signed_urls: { 'audio-block': source }
    }

    const result = proxyNotionVideoUrls(recordMap, 'https://img.cdn.619.pp.ua')

    expect(result).toBe(recordMap)
    expect(result.signed_urls['audio-block']).toBe(source)
  })
})
