import {
  buildNotionAssetFallbackCandidates,
  getMediaElementSrc,
  isFallbackCandidate,
  parseNotionMediaProxyUrl,
  retryNotionAssetElement
} from '@/lib/notionAssetFallback'

const NOTION_HOST = 'https://img.cdn.619.pp.ua'

describe('buildNotionAssetFallbackCandidates', () => {
  describe('images', () => {
    it('produces server-proxy then notion-origin tiers for a CDN-wrapped Notion image', () => {
      const src = `${NOTION_HOST}/image/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Fabc%2Fpic.png%3Fv%3D1?table=block&id=block-1`
      const candidates = buildNotionAssetFallbackCandidates({
        src,
        kind: 'image',
        notionHost: NOTION_HOST
      })

      const tiers = candidates.map(c => c.tier)
      expect(tiers).toEqual(['Proxy', 'Origin'])

      // 服务端代理回源到 notion.so（getNotionAssetDownloadSource 映射）。
      const proxyUrl = new URL(candidates[0].url, 'https://notionnext.local')
      expect(proxyUrl.pathname).toBe('/api/proxy-image')
      const proxied = proxyUrl.searchParams.get('url')
      expect(proxied.startsWith('https://www.notion.so/')).toBe(true)

      // 第3层是 notion.so 原域名直连。
      expect(candidates[1].url.startsWith('https://www.notion.so/')).toBe(true)
    })

    it('unwraps a Notion-wrapped third-party image without sending it through the restricted proxy', () => {
      const src =
        'https://img.cdn.619.pp.ua/image/https%3A%2F%2Fimages.unsplash.com%2Fphoto.jpg?width=800'
      const candidates = buildNotionAssetFallbackCandidates({
        src,
        kind: 'image',
        notionHost: NOTION_HOST
      })

      const tiers = candidates.map(c => c.tier)
      expect(tiers).toEqual(['Origin'])
      expect(candidates[0].url).toBe('https://images.unsplash.com/photo.jpg')
    })

    it('does not retry an ordinary third-party image through a Notion proxy', () => {
      const src = 'https://image.66619.eu.org/file/example.png'
      const candidates = buildNotionAssetFallbackCandidates({
        src,
        kind: 'image',
        notionHost: NOTION_HOST
      })
      expect(candidates).toEqual([])
    })
  })

  describe('media (video/audio)', () => {
    const mediaSrc = `${NOTION_HOST}/signed/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Faudio-id%2Fpodcast.mp3?table=block&id=audio-block`

    it('parses the Worker /signed/ wrapper into blockId and source', () => {
      const parsed = parseNotionMediaProxyUrl(mediaSrc, NOTION_HOST)
      expect(parsed).toEqual({
        id: 'audio-block',
        source:
          'https://prod-files-secure.s3.us-west-2.amazonaws.com/audio-id/podcast.mp3'
      })
    })

    it('produces a /api/notion-file tier then a notion.so origin tier', () => {
      const candidates = buildNotionAssetFallbackCandidates({
        src: mediaSrc,
        kind: 'media',
        notionHost: NOTION_HOST
      })

      const tiers = candidates.map(c => c.tier)
      // NoReferrer 始终保留；随后是服务端代理（FileApi）、origin 直连。
      expect(tiers).toEqual(['FileApi', 'Origin'])

      const fileApiUrl = new URL(candidates[0].url, 'https://notionnext.local')
      expect(fileApiUrl.pathname).toBe('/api/notion-file')
      expect(fileApiUrl.searchParams.get('id')).toBe('audio-block')
      expect(fileApiUrl.searchParams.get('source')).toBe(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/audio-id/podcast.mp3'
      )

      // 第3层把 host 换回 www.notion.so。
      expect(candidates[1].url.startsWith('https://www.notion.so/')).toBe(true)
      expect(candidates[1].url).toContain('/signed/')
    })

    it('ignores /signed/ URLs from unknown hosts', () => {
      const parsed = parseNotionMediaProxyUrl(
        'https://evil.example.com/signed/https%3A%2F%2Fx.mp3?id=b',
        NOTION_HOST
      )
      expect(parsed).toBeNull()
    })

    it('does not proxy an externally hosted media URL', () => {
      const candidates = buildNotionAssetFallbackCandidates({
        src: 'https://media.example.com/podcast.mp3?token=original',
        kind: 'media',
        notionHost: NOTION_HOST
      })
      expect(candidates).toEqual([])
    })
  })
})

describe('isFallbackCandidate', () => {
  it('accepts http(s) URLs', () => {
    expect(isFallbackCandidate('https://example.com/x.png')).toBe(true)
    expect(isFallbackCandidate('http://example.com/x.png')).toBe(true)
  })
  it('rejects empty, relative, or non-http schemes', () => {
    expect(isFallbackCandidate('')).toBe(false)
    expect(isFallbackCandidate(null)).toBe(false)
    expect(isFallbackCandidate('/local/x.png')).toBe(false)
    expect(isFallbackCandidate('data:image/png;base64,xx')).toBe(false)
  })
})

describe('getMediaElementSrc', () => {
  it('reads src attribute first', () => {
    const img = document.createElement('img')
    img.setAttribute('src', 'https://example.com/a.png')
    expect(getMediaElementSrc(img)).toBe('https://example.com/a.png')
  })
  it('falls back to data-src for lazy placeholders', () => {
    const img = document.createElement('img')
    img.dataset.src = 'https://example.com/lazy.png'
    expect(getMediaElementSrc(img)).toBe('https://example.com/lazy.png')
  })
  it('returns null when nothing is present', () => {
    expect(getMediaElementSrc(document.createElement('img'))).toBeNull()
  })
})

describe('retryNotionAssetElement', () => {
  it('advances an image through tiers and stops when exhausted', () => {
    const img = document.createElement('img')
    const originalSrc = `${NOTION_HOST}/image/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Fabc%2Fpic.png?table=block&id=b1`
    img.setAttribute('src', originalSrc)

    // 第1次失败 → 服务端代理。候选已在此刻固化。
    expect(retryNotionAssetElement(img, { notionHost: NOTION_HOST })).toBe(true)
    expect(img.getAttribute('src').startsWith('/api/proxy-image?')).toBe(true)
    expect(img.referrerPolicy).toBe('no-referrer')

    // 第2次失败 → 切到 notion.so 原域名。
    expect(retryNotionAssetElement(img, { notionHost: NOTION_HOST })).toBe(true)
    expect(img.getAttribute('src').startsWith('https://www.notion.so/')).toBe(
      true
    )

    // 候选耗尽。
    expect(retryNotionAssetElement(img, { notionHost: NOTION_HOST })).toBe(
      false
    )
  })

  it('advances a video element through /api/notion-file', () => {
    const video = document.createElement('video')
    video.load = jest.fn()
    video.setAttribute(
      'src',
      `${NOTION_HOST}/signed/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Fvid%2Fclip.mp4?table=block&id=video-block`
    )

    // 第1次 → /api/notion-file。
    expect(
      retryNotionAssetElement(video, { kind: 'media', notionHost: NOTION_HOST })
    ).toBe(true)
    expect(video.getAttribute('src').startsWith('/api/notion-file?')).toBe(true)
  })

  it('returns false for an unsupported src', () => {
    const img = document.createElement('img')
    img.setAttribute('src', '/local/relative.png')
    expect(retryNotionAssetElement(img, { notionHost: NOTION_HOST })).toBe(
      false
    )
  })

  it('rebuilds fallback state when a reused element receives a new source', () => {
    const img = document.createElement('img')
    const first = `${NOTION_HOST}/image/attachment%3Afirst.png?table=block&id=first`
    const second = `${NOTION_HOST}/image/attachment%3Asecond.png?table=block&id=second`

    img.setAttribute('src', first)
    expect(retryNotionAssetElement(img, { notionHost: NOTION_HOST })).toBe(true)

    img.setAttribute('src', second)
    expect(retryNotionAssetElement(img, { notionHost: NOTION_HOST })).toBe(true)

    const proxyUrl = new URL(
      img.getAttribute('src'),
      'https://notionnext.local'
    )
    expect(proxyUrl.searchParams.get('url')).toContain(
      'attachment%3Asecond.png'
    )
  })
})
