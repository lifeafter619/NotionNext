import { getPageContentText } from '@/lib/db/notion/getPageContentText'

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
})
