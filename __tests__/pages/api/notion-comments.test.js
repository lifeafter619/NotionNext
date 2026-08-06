const queryComments = jest.fn()

jest.mock('@notionhq/client', () => ({
  Client: jest.fn(() => ({
    databases: {
      query: queryComments,
      retrieve: jest.fn()
    },
    pages: {
      create: jest.fn(),
      retrieve: jest.fn()
    }
  }))
}))

process.env.NOTION_COMMENT_DATABASE_ID = 'comments-db'
process.env.NOTION_TOKEN = 'notion-token'

const handler = require('@/pages/api/notion-comments').default

function createResponse() {
  const response = {
    statusCode: 200,
    body: undefined,
    status: jest.fn(code => {
      response.statusCode = code
      return response
    }),
    json: jest.fn(body => {
      response.body = body
      return response
    })
  }
  return response
}

describe('/api/notion-comments GET pagination', () => {
  beforeEach(() => {
    queryComments.mockReset()
    queryComments.mockResolvedValue({
      results: [],
      has_more: false,
      next_cursor: null
    })
  })

  it('requires a post id', async () => {
    const response = createResponse()

    await handler({ method: 'GET', query: {}, headers: {} }, response)

    expect(response.statusCode).toBe(400)
    expect(queryComments).not.toHaveBeenCalled()
  })

  it('queries only one root page and clamps the requested page size', async () => {
    const response = createResponse()

    await handler(
      {
        method: 'GET',
        query: { postId: 'post-1', pageSize: '999' },
        headers: {}
      },
      response
    )

    expect(queryComments).toHaveBeenCalledTimes(1)
    expect(queryComments).toHaveBeenCalledWith(
      expect.objectContaining({
        database_id: 'comments-db',
        page_size: 50,
        start_cursor: undefined,
        filter: {
          and: [
            { property: 'PostId', title: { equals: 'post-1' } },
            { property: 'ParentId', rich_text: { is_empty: true } }
          ]
        }
      })
    )
    expect(response.body).toEqual({ comments: [], nextCursor: null })
  })

  it('passes the cursor and parent id when loading replies', async () => {
    queryComments.mockResolvedValue({
      results: [],
      has_more: true,
      next_cursor: 'next-page'
    })
    const response = createResponse()

    await handler(
      {
        method: 'GET',
        query: {
          postId: 'post-1',
          parentId: 'parent-1',
          cursor: 'cursor-1',
          pageSize: '5'
        },
        headers: {}
      },
      response
    )

    expect(queryComments).toHaveBeenCalledWith(
      expect.objectContaining({
        page_size: 5,
        start_cursor: 'cursor-1',
        filter: {
          and: [
            { property: 'PostId', title: { equals: 'post-1' } },
            { property: 'ParentId', rich_text: { equals: 'parent-1' } }
          ]
        }
      })
    )
    expect(response.body).toEqual({ comments: [], nextCursor: 'next-page' })
  })
})
