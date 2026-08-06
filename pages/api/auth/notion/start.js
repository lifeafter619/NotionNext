import {
  buildNotionOAuthAuthorizeUrl,
  createOAuthState,
  serializeOAuthStateCookie
} from '@/lib/db/notion/oauth'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.OAUTH_CLIENT_ID
  const redirectUri = process.env.OAUTH_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'OAuth configuration is missing' })
  }

  const state = createOAuthState()
  res.setHeader('Set-Cookie', serializeOAuthStateCookie(state))
  return res.redirect(
    302,
    buildNotionOAuthAuthorizeUrl({
      clientId,
      redirectUri,
      state,
      owner: process.env.OAUTH_OWNER || 'user'
    })
  )
}
