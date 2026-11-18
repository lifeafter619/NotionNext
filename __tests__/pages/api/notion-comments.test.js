const queryComments = jest.fn()
const mockCreate = jest.fn()
const mockRetrieve = jest.fn()

jest.mock('@notionhq/client', () => ({
  Client: jest.fn(() => ({
    databases: {
      query: queryComments,
      retrieve: mockRetrieve
    },
    pages: {
      create: mockCreate,
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

function makeResponse() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
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

describe('Notion comments anonymous mode', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      NOTION_TOKEN: 'test-token',
      NOTION_COMMENT_DATABASE_ID: 'test-database',
      NEXT_PUBLIC_COMMENT_NOTION_ANONYMOUS: 'true'
    }
    delete process.env.NOTION_COMMENT_REQUIRE_APPROVAL
    mockRetrieve.mockResolvedValue({
      properties: {
        Status: { type: 'select' },
        EmailHash: { type: 'rich_text' },
        UserAgent: { type: 'rich_text' }
      }
    })
    mockCreate.mockResolvedValue({ id: 'comment-1', properties: {} })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('ignores identifying fields and defaults to pending review', async () => {
    const handler = require('@/pages/api/notion-comments').default
    const res = makeResponse()
    await handler(
      {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.0.2.1', 'user-agent': 'test' },
        body: {
          postId: 'post-1',
          content: 'hello',
          author: 'reader@example.com'
        }
      },
      res
    )

    const properties = mockCreate.mock.calls[0][0].properties
    expect(properties.Status).toEqual({ select: { name: 'Pending' } })
    expect(properties).not.toHaveProperty('Author')
    expect(properties).not.toHaveProperty('EmailHash')
    expect(properties).not.toHaveProperty('IpAddress')
    expect(properties).not.toHaveProperty('UserAgent')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ pending: true })
    )
  })

  test('refuses submission when the review field is missing', async () => {
    mockRetrieve.mockResolvedValue({ properties: {} })
    const handler = require('@/pages/api/notion-comments').default
    const res = makeResponse()
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    await handler(
      {
        method: 'POST',
        headers: {},
        body: { postId: 'post-1', content: 'hello' }
      },
      res
    )
    expect(res.status).toHaveBeenCalledWith(500)
    expect(mockCreate).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
