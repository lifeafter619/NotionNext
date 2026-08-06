process.env.OAUTH_CLIENT_ID = 'oauth-client'
process.env.OAUTH_REDIRECT_URI = 'https://example.com/auth'

const startHandler = require('@/pages/api/auth/notion/start').default
const callbackHandler = require('@/pages/api/auth/callback/notion').default

function createResponse() {
  const response = {
    statusCode: 200,
    headers: {},
    body: undefined,
    redirectTarget: '',
    setHeader: jest.fn((name, value) => {
      response.headers[name.toLowerCase()] = value
    }),
    status: jest.fn(code => {
      response.statusCode = code
      return response
    }),
    json: jest.fn(body => {
      response.body = body
      return response
    }),
    redirect: jest.fn((status, target) => {
      response.statusCode = status
      response.redirectTarget = target
      return response
    })
  }
  return response
}

describe('Notion OAuth API routes', () => {
  it('starts authorization with a state matching the HttpOnly cookie', () => {
    const response = createResponse()

    startHandler({ method: 'GET' }, response)

    const cookie = response.headers['set-cookie']
    const state = /notion_oauth_state=([^;]+)/.exec(cookie)?.[1]
    const redirectUrl = new URL(response.redirectTarget)
    expect(response.statusCode).toBe(302)
    expect(cookie).toContain('HttpOnly')
    expect(redirectUrl.searchParams.get('state')).toBe(state)
    expect(redirectUrl.searchParams.get('client_id')).toBe('oauth-client')
  })

  it('forwards only the callback parameters used by the canonical route', () => {
    const response = createResponse()

    callbackHandler(
      {
        method: 'GET',
        query: {
          code: 'oauth-code',
          state: 'oauth-state',
          access_token: 'must-not-forward'
        }
      },
      response
    )

    expect(response.statusCode).toBe(307)
    expect(response.redirectTarget).toBe(
      '/auth?code=oauth-code&state=oauth-state'
    )
    expect(response.redirectTarget).not.toContain('access_token')
  })
})
