jest.mock('@/lib/server/claude/contributionStore', () => ({
  markContributionCacheDirty: jest.fn()
}))

jest.mock('@/lib/server/secureCompare', () => ({
  secureCompare: (received, expected) => received === expected
}))

const { markContributionCacheDirty } = require('@/lib/server/claude/contributionStore')
const handler = require('@/pages/api/claude/contribution-refresh').default

const createResponse = () => {
  const res = {
    statusCode: 200,
    body: undefined,
    status: jest.fn(code => {
      res.statusCode = code
      return res
    }),
    json: jest.fn(body => {
      res.body = body
      return res
    }),
    revalidate: jest.fn(async () => {})
  }
  return res
}

describe('/api/claude/contribution-refresh authentication', () => {
  beforeEach(() => {
    process.env.CLAUDE_CONTRIBUTION_TRIGGER_TOKEN = 'secret'
    markContributionCacheDirty.mockClear()
  })

  it('rejects GET query-string tokens', async () => {
    const res = createResponse()

    await handler(
      { method: 'GET', query: { token: 'secret' }, headers: {} },
      res
    )

    expect(res.statusCode).toBe(405)
    expect(markContributionCacheDirty).not.toHaveBeenCalled()
  })

  it('accepts a POST header token', async () => {
    const res = createResponse()

    await handler(
      {
        method: 'POST',
        query: { path: '/', revalidate: '0' },
        headers: { 'x-contribution-trigger-token': 'secret' }
      },
      res
    )

    expect(res.statusCode).toBe(200)
    expect(markContributionCacheDirty).toHaveBeenCalledTimes(1)
  })
})
