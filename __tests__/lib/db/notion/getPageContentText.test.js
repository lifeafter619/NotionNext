import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'

describe('getPageContentText', () => {
  it('handles missing transclusion reference blocks', () => {
    const post = {
      id: 'post-id',
      content: ['block-1']
    }
    const pageBlockMap = {
      block: {
        'block-1': {
          value: {
            id: 'block-1',
            type: 'transclusion_reference',
            format: {
              transclusion_reference_pointer: {
                id: 'missing-block'
              }
            }
          }
        }
      }
    }

    let result
    expect(() => {
      result = getPageContentText(post, pageBlockMap)
    }).not.toThrow()
    expect(result).toBe('')
  })

  it('extracts text after unwrapping a nested Notion record map', () => {
    const post = {
      id: 'post-id',
      content: ['text-block']
    }
    const rawBlockMap = {
      block: {
        'post-id': {
          spaceId: 'space-id',
          value: {
            value: {
              id: 'post-id',
              type: 'page',
              content: ['text-block']
            },
            role: 'reader'
          }
        },
        'text-block': {
          spaceId: 'space-id',
          value: {
            value: {
              id: 'text-block',
              type: 'text',
              properties: { title: [['Body text']] }
            },
            role: 'reader'
          }
        }
      }
    }

    expect(getPageContentText(post, adapterNotionBlockMap(rawBlockMap))).toBe(
      'Body text'
    )
  })
})
