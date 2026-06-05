import { cleanBlocksForRender } from '@/components/NotionPage'
import { compactBlockMapForClient } from '@/lib/db/notion/cleanBlockMapForClient'

jest.mock('react-notion-x', () => ({
  NotionRenderer: jest.fn(() => null)
}))

describe('cleanBlocksForRender', () => {
  it('removes unrenderable collection view blocks and parent references', () => {
    const blockMap = {
      block: {
        page: {
          value: {
            id: 'page',
            type: 'page',
            content: ['bad_collection', 'text']
          }
        },
        bad_collection: {
          value: {
            id: 'bad_collection',
            type: 'collection_view',
            view_ids: ['missing_view']
          }
        },
        text: {
          value: {
            id: 'text',
            type: 'text'
          }
        }
      },
      collection: {},
      collection_view: {},
      collection_query: {}
    }

    const cleaned = cleanBlocksForRender(blockMap)

    expect(cleaned.block.bad_collection).toBeUndefined()
    expect(cleaned.block.page.value.content).toEqual(['text'])
  })

  it('restores compact block maps before filtering render blocks', () => {
    const blockMap = {
      block: {
        page: {
          value: {
            id: 'page',
            type: 'page',
            content: ['text']
          }
        },
        text: {
          value: {
            id: 'text',
            type: 'text',
            parent_id: 'page',
            properties: {
              title: [['Body']]
            }
          }
        }
      }
    }

    const compact = compactBlockMapForClient(blockMap)
    const cleaned = cleanBlocksForRender(compact)

    expect(cleaned.__compact_block_ids).toBeUndefined()
    expect(cleaned.block.page.value.id).toBe('page')
    expect(cleaned.block.page.value.content).toEqual(['text'])
    expect(cleaned.block.text.value.id).toBe('text')
    expect(cleaned.block.text.value.parent_id).toBe('page')
  })
})
