import {
  cleanBlockMapForClient,
  cleanPostForClient
} from '@/lib/db/notion/cleanBlockMapForClient'

describe('cleanBlockMapForClient', () => {
  it('removes transient Notion block metadata while keeping render fields', () => {
    const blockMap = {
      block: {
        block1: {
          role: 'reader',
          value: {
            id: 'block1',
            type: 'text',
            parent_id: 'page1',
            parent_table: 'block',
            space_id: 'space1',
            created_time: 1,
            last_edited_time: 2,
            copied_from: 'copy-source',
            alive: true,
            permissions: [{ role: 'reader' }],
            version: 9,
            properties: {
              title: [['Hello']]
            },
            content: ['child1'],
            format: {
              block_color: 'gray_background',
              copied_from_pointer: {
                id: 'copy-source',
                table: 'block',
                spaceId: 'space1'
              },
              block_locked_by: 'user1'
            }
          }
        }
      },
      collection: {
        collection1: { value: { id: 'collection1' } }
      }
    }

    const result = cleanBlockMapForClient(blockMap)
    const value = result.block.block1.value

    expect(result).not.toBe(blockMap)
    expect(result.block.block1).not.toBe(blockMap.block.block1)
    expect(value).toEqual(
      expect.objectContaining({
        id: 'block1',
        type: 'text',
        parent_id: 'page1',
        properties: { title: [['Hello']] },
        content: ['child1'],
        format: { block_color: 'gray_background' }
      })
    )
    expect(result.block.block1.role).toBeUndefined()
    expect(value.space_id).toBeUndefined()
    expect(value.created_time).toBeUndefined()
    expect(value.last_edited_time).toBeUndefined()
    expect(value.parent_table).toBeUndefined()
    expect(value.copied_from).toBeUndefined()
    expect(value.permissions).toBeUndefined()
    expect(value.alive).toBeUndefined()
    expect(value.version).toBeUndefined()
    expect(value.format.copied_from_pointer).toBeUndefined()
    expect(value.format.block_locked_by).toBeUndefined()
    expect(blockMap.block.block1.value.space_id).toBe('space1')
  })

  it('removes server-only post content before sending article props to the client', () => {
    const post = {
      id: 'page1',
      title: 'Post',
      content: ['block1'],
      toc: [{ id: 'block1', text: 'Heading' }],
      blockMap: {
        block: {
          block1: {
            value: {
              id: 'block1',
              type: 'header',
              parent_id: 'page1',
              space_id: 'space1',
              properties: { title: [['Heading']] }
            }
          }
        }
      }
    }

    const result = cleanPostForClient(post)

    expect(result).not.toBe(post)
    expect(result.content).toBeUndefined()
    expect(result.toc).toEqual(post.toc)
    expect(result.blockMap.block.block1.value.space_id).toBeUndefined()
    expect(post.content).toEqual(['block1'])
    expect(post.blockMap.block.block1.value.space_id).toBe('space1')
  })
})
