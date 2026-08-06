jest.mock('@/lib/db/SiteDataApi', () => ({
  resolvePostProps: jest.fn()
}))

const { createHash } = require('crypto')
const { resolvePostProps } = require('@/lib/db/SiteDataApi')
const handler = require('@/pages/api/unlock-post').default

const postId = '12345678-1234-1234-1234-123456789abc'
const sha256 = value => createHash('sha256').update(value).digest('hex')

const createResponse = () => {
  const res = {
    headers: {},
    status: jest.fn(code => {
      res.statusCode = code
      return res
    }),
    setHeader: jest.fn((name, value) => {
      res.headers[name] = value
    }),
    json: jest.fn(body => {
      res.body = body
      return res
    })
  }
  return res
}

describe('/api/unlock-post', () => {
  it('returns protected content only after server-side verification', async () => {
    resolvePostProps.mockResolvedValue({
      post: {
        id: postId,
        slug: 'article/private',
        password: sha256('secret'),
        blockMap: { block: { private: { value: { type: 'text' } } } }
      }
    })
    const res = createResponse()

    await handler(
      {
        method: 'POST',
        body: { postId, password: 'secret', locale: 'zh-CN' }
      },
      res
    )

    expect(resolvePostProps).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: postId,
        includeProtectedContent: true
      })
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body.post.blockMap).toBeDefined()
    expect(res.body.post.password).toBeUndefined()
    expect(res.headers['Cache-Control']).toBe('private, no-store')
  })

  it('does not return content for a wrong password', async () => {
    resolvePostProps.mockResolvedValue({
      post: {
        id: postId,
        slug: 'article/private',
        password: sha256('secret'),
        blockMap: { block: { private: { value: { type: 'text' } } } }
      }
    })
    const res = createResponse()

    await handler({ method: 'POST', body: { postId, password: 'wrong' } }, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body.post).toBeUndefined()
  })
})
