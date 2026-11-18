import {
  buildWalineEmojiAssetCandidates,
  fetchWalineEmojiInfoWithFallback,
  retryWalineEmojiImage
} from '@/lib/walineEmojiProxy'

const NOTION_HOST = 'https://img.cdn.619.pp.ua'

describe('Waline emoji proxy fallback', () => {
  it('orders elemecdn before the Worker, unpkg, and the local API', () => {
    const source = 'https://unpkg.com/@waline/emojis/tieba/tieba_agree.png'

    expect(buildWalineEmojiAssetCandidates(source, NOTION_HOST)).toEqual([
      'https://npm.elemecdn.com/@waline/emojis@1.2.0/tieba/tieba_agree.png',
      'https://img.cdn.619.pp.ua/external/waline-emojis/1.2.0/tieba/tieba_agree.png',
      source,
      `/api/proxy-image?url=${encodeURIComponent(source)}`
    ])
  })

  it('moves a failed image through every fallback layer', () => {
    const img = document.createElement('img')
    img.alt = 'tieba_agree'
    img.src =
      'https://npm.elemecdn.com/@waline/emojis@1.2.0/tieba/tieba_agree.png'

    expect(retryWalineEmojiImage(img, NOTION_HOST)).toBe(true)
    expect(img.src).toBe(
      'https://img.cdn.619.pp.ua/external/waline-emojis/1.2.0/tieba/tieba_agree.png'
    )

    expect(retryWalineEmojiImage(img, NOTION_HOST)).toBe(true)
    expect(img.src).toBe(
      'https://unpkg.com/@waline/emojis@1.2.0/tieba/tieba_agree.png'
    )

    expect(retryWalineEmojiImage(img, NOTION_HOST)).toBe(true)
    expect(img.getAttribute('src')).toBe(
      `/api/proxy-image?url=${encodeURIComponent(
        'https://unpkg.com/@waline/emojis@1.2.0/tieba/tieba_agree.png'
      )}`
    )
    expect(img.referrerPolicy).toBe('no-referrer')
  })

  it('tries emoji metadata through elemecdn and then the Worker', async () => {
    const failed = {
      ok: false,
      status: 503,
      body: { cancel: jest.fn() }
    }
    const success = {
      ok: true,
      status: 200,
      json: async () => ({
        name: 'Tieba',
        prefix: 'tieba_',
        type: 'png',
        icon: 'agree',
        items: ['agree']
      })
    }
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(failed)
      .mockResolvedValueOnce(success)

    const response = await fetchWalineEmojiInfoWithFallback(
      fetchImpl,
      'https://npm.elemecdn.com/@waline/emojis@1.2.0/tieba/info.json',
      undefined,
      NOTION_HOST
    )

    expect(response).toBe(success)
    expect(fetchImpl.mock.calls.map(call => call[0])).toEqual([
      'https://npm.elemecdn.com/@waline/emojis@1.2.0/tieba/info.json',
      'https://img.cdn.619.pp.ua/external/waline-emojis/1.2.0/tieba/info.json'
    ])
  })

  it('returns an empty preset instead of breaking Waline when all layers fail', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'))

    const response = await fetchWalineEmojiInfoWithFallback(
      fetchImpl,
      'https://npm.elemecdn.com/@waline/emojis@1.2.0/tieba/info.json',
      undefined,
      NOTION_HOST
    )

    await expect(response.json()).resolves.toMatchObject({
      name: 'tieba',
      items: []
    })
  })

  it('ignores arbitrary unpkg packages', () => {
    const img = document.createElement('img')
    img.src = 'https://unpkg.com/example-package/image.png'

    expect(retryWalineEmojiImage(img, NOTION_HOST)).toBe(false)
    expect(img.src).toBe('https://unpkg.com/example-package/image.png')
  })

  it('shows readable emoji text after every image layer fails', () => {
    const wrapper = document.createElement('div')
    const img = document.createElement('img')
    img.alt = 'tieba_agree'
    img.src =
      'https://npm.elemecdn.com/@waline/emojis@1.2.0/tieba/tieba_agree.png'
    wrapper.appendChild(img)

    retryWalineEmojiImage(img, NOTION_HOST)
    retryWalineEmojiImage(img, NOTION_HOST)
    retryWalineEmojiImage(img, NOTION_HOST)
    expect(retryWalineEmojiImage(img, NOTION_HOST)).toBe(true)

    expect(wrapper.querySelector('img')).toBeNull()
    expect(wrapper.textContent).toBe(':tieba_agree:')
  })
})
