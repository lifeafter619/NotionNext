import { cleanBlocksForRender } from '@/components/NotionPage'

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
})
