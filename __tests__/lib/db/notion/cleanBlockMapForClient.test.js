import {
  compactBlockMapForClient,
  cleanBlockMapForClient,
  cleanPostForClient,
  restoreCompactBlockMapForRender
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

  it('drops orphan automation record maps while keeping renderer data', () => {
    const blockMap = {
      block: {
        block1: {
          value: {
            id: 'block1',
            type: 'text',
            properties: { title: [['Hello']] }
          }
        }
      },
      collection: {
        collection1: { value: { id: 'collection1' } }
      },
      collection_view: {
        view1: { value: { id: 'view1' } }
      },
      collection_query: {},
      signed_urls: {
        block1: 'https://file.notion.so/signed-url'
      },
      notion_user: {},
      automation: {
        automation1: {
          value: {
            value: {
              id: 'automation1',
              status: 'active'
            }
          }
        }
      },
      automation_action: {
        action1: {
          value: {
            value: {
              id: 'action1'
            }
          }
        }
      }
    }

    const result = cleanBlockMapForClient(blockMap)

    expect(result.collection).toEqual(blockMap.collection)
    expect(result.collection_view).toEqual(blockMap.collection_view)
    expect(result.collection_query).toEqual(blockMap.collection_query)
    expect(result.signed_urls).toEqual(blockMap.signed_urls)
    expect(result.notion_user).toEqual(blockMap.notion_user)
    expect(result.automation).toBeUndefined()
    expect(result.automation_action).toBeUndefined()
    expect(blockMap.signed_urls.block1).toBe(
      'https://file.notion.so/signed-url'
    )
  })

  it('keeps automation records referenced by button blocks', () => {
    const blockMap = {
      block: {
        button1: {
          value: {
            id: 'button1',
            type: 'button',
            format: {
              automation_id: 'automation1'
            }
          }
        }
      },
      automation: {
        automation1: {
          value: {
            id: 'automation1',
            action_ids: ['action1'],
            properties: {
              name: 'Run action'
            }
          }
        },
        orphanAutomation: {
          value: {
            id: 'orphanAutomation'
          }
        }
      },
      automation_action: {
        action1: {
          value: {
            id: 'action1',
            type: 'open_page'
          }
        },
        orphanAction: {
          value: {
            id: 'orphanAction'
          }
        }
      }
    }

    const result = cleanBlockMapForClient(blockMap)

    expect(result.automation).toEqual({
      automation1: blockMap.automation.automation1
    })
    expect(result.automation_action).toEqual({
      action1: blockMap.automation_action.action1
    })
  })

  it('normalizes nested automation records for Notion button rendering', () => {
    const blockMap = {
      block: {
        button1: {
          value: {
            id: 'button1',
            type: 'button',
            format: {
              automation_id: 'automation1',
              block_color: 'blue_background'
            }
          }
        }
      },
      automation: {
        automation1: {
          spaceId: 'space1',
          value: {
            role: 'reader',
            value: {
              id: 'automation1',
              action_ids: ['action1'],
              properties: {
                name: 'Open docs'
              }
            }
          }
        }
      },
      automation_action: {
        action1: {
          value: {
            role: 'reader',
            value: {
              id: 'action1',
              type: 'open_page',
              config: {
                target: {
                  type: 'url',
                  url: 'https://example.com/docs'
                }
              }
            }
          }
        }
      }
    }

    const result = cleanBlockMapForClient(blockMap)

    expect(result.automation.automation1.value).toEqual({
      id: 'automation1',
      action_ids: ['action1'],
      properties: {
        name: 'Open docs'
      }
    })
    expect(result.automation_action.action1.value).toEqual({
      id: 'action1',
      type: 'open_page',
      config: {
        target: {
          type: 'url',
          url: 'https://example.com/docs'
        }
      }
    })
  })

  it('normalizes nested collection records for renderer compatibility', () => {
    const blockMap = {
      block: {
        collectionBlock: {
          value: {
            id: 'collectionBlock',
            type: 'collection_view',
            collection_id: 'collection1',
            view_ids: ['view1']
          }
        }
      },
      collection: {
        collection1: {
          spaceId: 'space1',
          value: {
            role: 'reader',
            value: {
              id: 'collection1',
              schema: {
                title: { name: 'Name', type: 'title' }
              },
              version: 12,
              space_id: 'space1'
            }
          }
        }
      },
      collection_view: {
        view1: {
          value: {
            role: 'reader',
            value: {
              id: 'view1',
              type: 'table',
              version: 3,
              space_id: 'space1'
            }
          }
        }
      },
      collection_query: {
        collection1: {
          view1: {
            collection_group_results: {
              blockIds: []
            }
          }
        }
      }
    }

    const result = cleanBlockMapForClient(blockMap)

    expect(result.collection.collection1.value).toEqual({
      id: 'collection1',
      schema: {
        title: { name: 'Name', type: 'title' }
      }
    })
    expect(result.collection_view.view1.value).toEqual({
      id: 'view1',
      type: 'table'
    })
  })

  it('drops image and page signed URLs that the client can derive from block data', () => {
    const blockMap = {
      block: {
        page1: {
          value: {
            id: 'page1',
            type: 'page',
            format: {
              page_cover: 'attachment:cover-id:cover.png'
            }
          }
        },
        image1: {
          value: {
            id: 'image1',
            type: 'image',
            properties: {
              source: [['attachment:image-id:image.png']]
            }
          }
        },
        gif1: {
          value: {
            id: 'gif1',
            type: 'image',
            properties: {
              source: [['attachment:gif-id:animated.gif']]
            }
          }
        },
        file1: {
          value: {
            id: 'file1',
            type: 'file',
            properties: {
              source: [['attachment:file-id:file.zip']]
            }
          }
        }
      },
      signed_urls: {
        page1: 'https://file.notion.so/cover.png',
        image1: 'https://file.notion.so/image.png',
        gif1: 'https://file.notion.so/animated.gif',
        file1: 'https://file.notion.so/file.zip'
      }
    }

    const result = cleanBlockMapForClient(blockMap)

    expect(result.signed_urls).toEqual({
      gif1: 'https://file.notion.so/animated.gif',
      file1: 'https://file.notion.so/file.zip'
    })
    expect(blockMap.signed_urls.page1).toBe('https://file.notion.so/cover.png')
  })

  it('compacts repeated block ids and block references for client transfer', () => {
    const blockMap = {
      block: {
        page1: {
          value: {
            id: 'page1',
            type: 'page',
            content: ['child1', 'ref1']
          }
        },
        child1: {
          value: {
            id: 'child1',
            type: 'text',
            parent_id: 'page1',
            properties: { title: [['Body']] }
          }
        },
        ref1: {
          value: {
            id: 'ref1',
            type: 'transclusion_reference',
            parent_id: 'page1',
            format: {
              transclusion_reference_pointer: {
                id: 'source1'
              }
            }
          }
        },
        source1: {
          value: {
            id: 'source1',
            type: 'transclusion_container',
            parent_id: 'other-page',
            content: ['child1']
          }
        }
      }
    }

    const result = compactBlockMapForClient(blockMap)

    expect(result.__compact_block_ids).toEqual([
      'page1',
      'child1',
      'ref1',
      'source1'
    ])
    expect(Array.isArray(result.block)).toBe(true)
    expect(result.block.page1).toBeUndefined()

    const restored = restoreCompactBlockMapForRender(result)

    expect(restored.block.page1.value.content).toEqual(['child1', 'ref1'])
    expect(restored.block.child1.value.parent_id).toBe('page1')
    expect(
      restored.block.ref1.value.format.transclusion_reference_pointer.id
    ).toBe('source1')
    expect(restored.block.source1.value.parent_id).toBe('other-page')
  })

  it('compacts repeated block value keys and restores renderable records', () => {
    const blockMap = {
      block: {
        page1: {
          value: {
            id: 'page1',
            type: 'page',
            parent_id: 'workspace',
            properties: {
              title: [['Post title']]
            },
            content: ['child1']
          }
        },
        child1: {
          value: {
            id: 'child1',
            type: 'text',
            parent_id: 'page1',
            properties: {
              title: [['Body']]
            },
            format: {
              block_color: 'gray_background'
            }
          }
        }
      }
    }

    const compact = compactBlockMapForClient(blockMap)

    expect(Array.isArray(compact.block)).toBe(true)
    expect(compact.__compact_block_value_keys).toEqual([
      'type',
      'parent_id',
      'properties',
      'content',
      'format',
      'file_ids'
    ])
    expect(compact.__compact_block_types).toEqual(['page', 'text'])
    expect(compact.__compact_property_keys).toEqual(['title'])
    expect(compact.block[0]).toEqual([0, 'workspace', [[['Post title']]], [1]])
    expect(compact.block[1]).toEqual([
      1,
      0,
      [[['Body']]],
      null,
      { block_color: 'gray_background' }
    ])

    const restored = restoreCompactBlockMapForRender(compact)

    expect(restored.__compact_block_ids).toBeUndefined()
    expect(restored.__compact_block_value_keys).toBeUndefined()
    expect(restored.__compact_block_types).toBeUndefined()
    expect(restored.__compact_property_keys).toBeUndefined()
    expect(restored.block.page1.value).toEqual(blockMap.block.page1.value)
    expect(restored.block.child1.value).toEqual(blockMap.block.child1.value)
  })
})
