import { buildSafeOAuthRedirectQuery } from '@/lib/db/notion/oauth'

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
})
