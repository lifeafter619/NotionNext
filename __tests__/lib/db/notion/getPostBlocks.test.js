// Mock the notionAPI dependency to avoid ESM import issues
jest.mock('@/lib/db/notion/getNotionAPI', () => ({
  __esModule: true,
  default: {}
}))

jest.mock('@/lib/cache/cache_manager', () => ({
  getDataFromCache: jest.fn(),
  getOrSetDataWithCache: jest.fn(),
  setDataToCache: jest.fn()
}))

import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'

describe('formatNotionBlock', () => {
  it('should remove blocks with missing value.id', () => {
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
          // id is missing
          properties: { title: [['World']] }
        }
      },
      'block-3': {
        // value is missing entirely
      }
    }

    const result = formatNotionBlock(block)

    expect(result['block-1']).toBeDefined()
    expect(result['block-1'].value.id).toBe('block-1')
    expect(result['block-2']).toBeUndefined()
    expect(result['block-3']).toBeUndefined()
  })

  it('should keep blocks with valid value.id', () => {
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
})
