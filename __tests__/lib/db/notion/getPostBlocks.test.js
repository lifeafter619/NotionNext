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
jest.mock('notion-utils', () => ({
  getBlockValue: jest.fn(entry => entry?.value?.value || entry?.value || entry)
}))

import {
  formatNotionBlock,
  hasExpiredSignedUrls,
  preferStablePdfSignedUrls
} from '@/lib/db/notion/getPostBlocks'
import {
  isAppleMusicEmbedUrl,
  isExternalVideoEmbedUrl,
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

  it('rewrites short-link video pages to embeds instead of native video', () => {
    const url = 'https://b23.tv/v2l2EEX'
    const blockValue = {
      type: 'video',
      properties: {
        source: [[url]]
      }
    }

    expect(isExternalVideoEmbedUrl(url)).toBe(true)
    normalizeExternalMediaBlock(blockValue)

    expect(blockValue.type).toBe('embed')
  })

  it('keeps direct media URLs as native video blocks', () => {
    const urls = [
      'https://cdn.example.com/videos/demo.mp4?token=abc',
      'https://cdn.example.com/videos/demo.webm',
      'https://cdn.example.com/videos/stream.m3u8'
    ]

    for (const url of urls) {
      const blockValue = {
        type: 'video',
        properties: {
          source: [[url]]
        }
      }

      expect(isExternalVideoEmbedUrl(url)).toBe(false)
      normalizeExternalMediaBlock(blockValue)
      expect(blockValue.type).toBe('video')
    }
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

  it('relinks synced block content children to the original parent', () => {
    const formatted = formatNotionBlock({
      page: {
        value: {
          id: 'page',
          type: 'page',
          content: ['sync']
        }
      },
      sync: {
        value: {
          id: 'sync',
          type: 'sync_block',
          parent_id: 'page',
          content: ['notice-line']
        }
      },
      'notice-line': {
        value: {
          id: 'notice-line',
          type: 'text',
          parent_id: 'sync',
          properties: {
            title: [['Notice']]
          }
        }
      }
    })

    expect(formatted.page.value.content).toEqual(['sync_child_0'])
    expect(formatted.sync).toBeUndefined()
    expect(formatted['notice-line']).toBeUndefined()
    expect(formatted.sync_child_0.value.id).toBe('sync_child_0')
    expect(formatted.sync_child_0.value.parent_id).toBe('page')
  })

  it('relinks synced block inline children to the original parent', () => {
    const formatted = formatNotionBlock({
      page: {
        value: {
          id: 'page',
          type: 'page',
          content: ['sync']
        }
      },
      sync: {
        value: {
          id: 'sync',
          type: 'sync_block',
          parent_id: 'page',
          children: [
            {
              value: {
                id: 'inline-child',
                type: 'text',
                parent_id: 'sync',
                properties: {
                  title: [['Inline notice']]
                }
              }
            }
          ]
        }
      }
    })

    expect(formatted.page.value.content).toEqual(['sync_child_0'])
    expect(formatted.sync).toBeUndefined()
    expect(formatted.sync_child_0.value.id).toBe('sync_child_0')
    expect(formatted.sync_child_0.value.parent_id).toBe('page')
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

  it('fills external object instance domain from its original URL', () => {
    const formatted = formatNotionBlock({
      'github-repo': {
        value: {
          id: 'github-repo',
          type: 'external_object_instance',
          format: {
            original_url: 'https://github.com/lifeafter619/Aboard',
            attributes: [{ id: 'title', values: ['Aboard'] }]
          }
        }
      }
    })

    expect(formatted['github-repo'].value.format.domain).toBe('github.com')
  })

  it('normalizes official synced block references for react-notion-x', () => {
    const formatted = formatNotionBlock({
      'synced-ref': {
        value: {
          id: 'synced-ref',
          type: 'synced_block',
          parent_id: 'page',
          synced_block: {
            synced_from: {
              type: 'block_id',
              block_id: 'source-block'
            }
          }
        }
      }
    })

    expect(formatted['synced-ref'].value.type).toBe('transclusion_reference')
    expect(
      formatted['synced-ref'].value.format.transclusion_reference_pointer
    ).toEqual({
      id: 'source-block',
      table: 'block'
    })
    expect(formatted['synced-ref'].value.synced_block).toBeUndefined()
  })

  it('normalizes official rich text block payloads for react-notion-x', () => {
    const formatted = formatNotionBlock({
      paragraph: {
        value: {
          id: 'paragraph',
          type: 'paragraph',
          parent_id: 'page',
          paragraph: {
            rich_text: [
              {
                plain_text: 'Hello ',
                annotations: { bold: true }
              },
              {
                plain_text: 'docs',
                href: 'https://example.com',
                annotations: {}
              }
            ],
            color: 'blue_background'
          }
        }
      },
      todo: {
        value: {
          id: 'todo',
          type: 'to_do',
          parent_id: 'page',
          to_do: {
            rich_text: [{ plain_text: 'Ship it', annotations: {} }],
            checked: true
          }
        }
      },
      code: {
        value: {
          id: 'code',
          type: 'code',
          parent_id: 'page',
          code: {
            rich_text: [{ plain_text: 'console.log(1)', annotations: {} }],
            language: 'JavaScript'
          }
        }
      },
      heading: {
        value: {
          id: 'heading',
          type: 'heading_1',
          parent_id: 'page',
          heading_1: {
            rich_text: [{ plain_text: 'Toggle heading', annotations: {} }],
            is_toggleable: true
          }
        }
      }
    })

    expect(formatted.paragraph.value.type).toBe('text')
    expect(formatted.paragraph.value.properties.title).toEqual([
      ['Hello ', [['b']]],
      ['docs', [['a', 'https://example.com']]]
    ])
    expect(formatted.paragraph.value.format.block_color).toBe('blue_background')
    expect(formatted.paragraph.value.paragraph).toBeUndefined()

    expect(formatted.todo.value.properties.checked).toEqual([['Yes']])
    expect(formatted.todo.value.properties.title).toEqual([['Ship it']])

    expect(formatted.code.value.properties.language).toEqual([['JavaScript']])
    expect(formatted.code.value.properties.title).toEqual([['console.log(1)']])

    expect(formatted.heading.value.type).toBe('header')
    expect(formatted.heading.value.format.toggleable).toBe(true)
    expect(formatted.heading.value.properties.title).toEqual([
      ['Toggle heading']
    ])
  })

  it('rewrites external video player pages to embeds directly', () => {
    const url =
      'https://www.happinessrailway.com/dplayer.htm?n=https%3A%2F%2Fvip.lz-cdn16.com%2F20230312%2F12364_a86fbcc4%2Findex.m3u8'
    const blockValue = {
      type: 'video',
      properties: {
        source: [[url]]
      }
    }

    expect(isExternalVideoEmbedUrl(url)).toBe(true)
    normalizeExternalMediaBlock(blockValue)

    expect(blockValue.type).toBe('embed')
  })

  it('normalizes external video player pages from video blocks to embed blocks', () => {
    const formatted = formatNotionBlock({
      'external-player': {
        value: {
          id: 'external-player',
          type: 'video',
          properties: {
            source: [
              [
                'https://www.happinessrailway.com/dplayer.htm?n=https%3A%2F%2Fvip.lz-cdn16.com%2F20230312%2F12364_a86fbcc4%2Findex.m3u8'
              ]
            ]
          }
        }
      }
    })

    expect(formatted['external-player'].value.type).toBe('embed')
  })

  it('rewrites newer Notion pdf file URLs to signed URLs', () => {
    const formatted = formatNotionBlock({
      pdf: {
        value: {
          id: 'pdf-block',
          type: 'pdf',
          properties: {
            source: [
              [
                'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/file.pdf'
              ]
            ]
          }
        }
      }
    })

    expect(formatted.pdf.value.properties.source[0][0]).toBe(
      'https://notion.so/signed/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Fspace%2Ffile.pdf?table=block&id=pdf-block'
    )
  })

  it('does not rewrite lookalike Notion file URLs', () => {
    const url = 'https://evil.example/secure.notion-static.com/file.pdf'
    const formatted = formatNotionBlock({
      pdf: {
        value: {
          id: 'pdf-block',
          type: 'pdf',
          properties: {
            source: [[url]]
          }
        }
      }
    })

    expect(formatted.pdf.value.properties.source[0][0]).toBe(url)
  })

  it('detects expired cached Notion signed URLs', () => {
    expect(
      hasExpiredSignedUrls({
        signed_urls: {
          pdf: 'https://file.notion.so/f/file.pdf?expirationTimestamp=1'
        }
      })
    ).toBe(true)
  })

  it('does not treat signed URLs without an expiration timestamp as expired', () => {
    expect(
      hasExpiredSignedUrls({
        signed_urls: {
          pdf: 'https://notion.so/signed/file.pdf?table=block&id=pdf'
        }
      })
    ).toBe(false)
  })

  it('uses stable Notion signed entry for pdf preview URLs', () => {
    const recordMap = {
      signed_urls: {
        pdf: 'https://file.notion.so/f/file.pdf?expirationTimestamp=1'
      },
      block: {
        pdf: {
          value: {
            id: 'pdf',
            type: 'pdf',
            properties: {
              source: [
                [
                  'https://prod-files-secure.s3.us-west-2.amazonaws.com/file.pdf'
                ]
              ]
            }
          }
        }
      }
    }

    preferStablePdfSignedUrls(recordMap)

    expect(recordMap.signed_urls.pdf).toBe(
      'https://notion.so/signed/https%3A%2F%2Fprod-files-secure.s3.us-west-2.amazonaws.com%2Ffile.pdf?table=block&id=pdf'
    )
  })

  it('keeps external pdf preview URLs out of the Notion signed URL map', () => {
    const recordMap = {
      signed_urls: {},
      block: {
        pdf: {
          value: {
            id: 'pdf',
            type: 'pdf',
            properties: {
              source: [['https://cdn.example.com/file.pdf']]
            }
          }
        }
      }
    }

    preferStablePdfSignedUrls(recordMap)

    expect(recordMap.signed_urls.pdf).toBeUndefined()
  })
})
