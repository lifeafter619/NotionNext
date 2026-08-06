import {
  buildNotionOAuthAuthorizeUrl,
  buildSafeOAuthRedirectQuery,
  consumeOAuthState,
  createOAuthState,
  NOTION_OAUTH_STATE_COOKIE,
  serializeOAuthStateCookie
} from '@/lib/db/notion/oauth'

describe('Notion OAuth helpers', () => {
  it('does not expose tokens or owner email in redirect query params', () => {
    const query = buildSafeOAuthRedirectQuery({
      access_token: 'secret-access-token',
      refresh_token: 'secret-refresh-token',
      workspace_name: 'Example Workspace',
      workspace_id: 'workspace-1',
      owner: {
        type: 'user',
        user: {
          person: {
            email: 'owner@example.com'
          }
        }
      }
    })

    expect(query).toEqual({
      msg: '授权成功：Example Workspace',
      workspace_name: 'Example Workspace',
      workspace_id: 'workspace-1'
    })
    expect(JSON.stringify(query)).not.toContain('secret-access-token')
    expect(JSON.stringify(query)).not.toContain('secret-refresh-token')
    expect(JSON.stringify(query)).not.toContain('owner@example.com')
  })

  it('creates an unpredictable state and stores it in an HttpOnly cookie', () => {
    const first = createOAuthState()
    const second = createOAuthState()
    const cookie = serializeOAuthStateCookie(first)

    expect(first).toHaveLength(64)
    expect(second).not.toBe(first)
    expect(cookie).toContain(`${NOTION_OAUTH_STATE_COOKIE}=${first}`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Max-Age=600')
  })

  it('accepts only the matching state and always clears the cookie', () => {
    const setHeader = jest.fn()
    const req = {
      cookies: { [NOTION_OAUTH_STATE_COOKIE]: 'expected-state' }
    }

    expect(consumeOAuthState(req, { setHeader }, 'expected-state')).toBe(true)
    expect(setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('Max-Age=0')
    )
    expect(consumeOAuthState(req, { setHeader: jest.fn() }, 'wrong-state')).toBe(
      false
    )
    expect(consumeOAuthState({ cookies: {} }, { setHeader: jest.fn() }, '')).toBe(
      false
    )
  })

  it('includes state in the Notion authorization URL', () => {
    const url = new URL(
      buildNotionOAuthAuthorizeUrl({
        clientId: 'client-id',
        redirectUri: 'https://example.com/auth',
        state: 'oauth-state'
      })
    )

    expect(url.origin).toBe('https://api.notion.com')
    expect(url.searchParams.get('client_id')).toBe('client-id')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://example.com/auth'
    )
    expect(url.searchParams.get('state')).toBe('oauth-state')
  })
})
