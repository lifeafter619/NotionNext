jest.mock('@/lib/db/notion/getNotionAPI', () => ({
  __esModule: true,
  default: {}
}))

jest.mock('@/lib/cache/cache_manager', () => ({
  getDataFromCache: jest.fn(),
  getOrSetDataWithCache: jest.fn(),
  setDataToCache: jest.fn()
}))

jest.mock('p-limit', () => () => fn => fn())

import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import {
  isAppleMusicEmbedUrl,
  normalizeExternalMediaBlock
} from '@/lib/db/notion/normalizeExternalMediaBlock'

describe('formatNotionBlock', () => {
  it('removes blocks with missing value.id', () => {
    const block = {
      'block-1': {
        value: {
          id: 'block-1',
          type: 'text',
          properties: { title: [['Hello']] }
        }
      },
      'block-2': {
        value: {
          type: 'text',
          properties: { title: [['World']] }
        }
      },
      'block-3': {}
    }

    const result = formatNotionBlock(block)

    expect(result['block-1']).toBeDefined()
    expect(result['block-1'].value.id).toBe('block-1')
    expect(result['block-2']).toBeUndefined()
    expect(result['block-3']).toBeUndefined()
  })

  it('keeps blocks with valid value.id', () => {
    const block = {
      'block-1': {
        value: {
          id: 'block-1',
          type: 'text',
          properties: { title: [['Hello']] }
        }
      }
    }

    const result = formatNotionBlock(block)

    expect(result['block-1']).toBeDefined()
    expect(result['block-1'].value.id).toBe('block-1')
  })

  it('detects Apple Music single-track embed URLs', () => {
    expect(
      isAppleMusicEmbedUrl(
        'https://embed.music.apple.com/us/song/neon-blue/324357768'
      )
    ).toBe(true)

    expect(
      isAppleMusicEmbedUrl(
        'https://embed.music.apple.com/us/album/girls-come-too/324357208'
      )
    ).toBe(false)
  })

  it('rewrites Apple Music song video blocks to embeds directly', () => {
    const blockValue = {
      type: 'video',
      properties: {
        source: [['https://embed.music.apple.com/us/song/neon-blue/324357768']]
      }
    }

    normalizeExternalMediaBlock(blockValue)

    expect(blockValue.type).toBe('embed')
  })

  it('leaves non-matching video blocks unchanged during direct normalization', () => {
    const blockValue = {
      type: 'video',
      properties: {
        source: [['https://www.youtube.com/watch?v=dQw4w9WgXcQ']]
      }
    }

    normalizeExternalMediaBlock(blockValue)

    expect(blockValue.type).toBe('video')
  })

  it('normalizes Apple Music song embeds from video blocks to embed blocks', () => {
    const formatted = formatNotionBlock({
      'apple-music-song': {
        value: {
          id: 'apple-music-song',
          type: 'video',
          properties: {
            source: [
              [
                'https://embed.music.apple.com/us/song/never-gonna-give-you-up/1559523357?i=1559523359'
              ]
            ]
          }
        }
      }
    })

    expect(formatted['apple-music-song'].value.type).toBe('embed')
  })

  it('keeps regular hosted videos as video blocks', () => {
    const formatted = formatNotionBlock({
      'hosted-video': {
        value: {
          id: 'hosted-video',
          type: 'video',
          properties: {
            source: [['https://cdn.example.com/videos/demo.mp4']]
          }
        }
      }
    })

    expect(formatted['hosted-video'].value.type).toBe('video')
  })
})
