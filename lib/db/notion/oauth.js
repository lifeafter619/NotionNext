import { randomBytes, timingSafeEqual } from 'node:crypto'

export const NOTION_API_VERSION = '2026-03-11'
export const NOTION_OAUTH_STATE_COOKIE = 'notion_oauth_state'
export const NOTION_OAUTH_STATE_TTL_SECONDS = 10 * 60

export function createOAuthState() {
  return randomBytes(32).toString('hex')
}

export function serializeOAuthStateCookie(state) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${NOTION_OAUTH_STATE_COOKIE}=${encodeURIComponent(
    state
  )}; Max-Age=${NOTION_OAUTH_STATE_TTL_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`
}

export function clearOAuthStateCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${NOTION_OAUTH_STATE_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`
}

export function getOAuthStateFromRequest(req) {
  if (req?.cookies?.[NOTION_OAUTH_STATE_COOKIE]) {
    return req.cookies[NOTION_OAUTH_STATE_COOKIE]
  }

  const cookieHeader = req?.headers?.cookie || ''
  const match = cookieHeader
    .split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${NOTION_OAUTH_STATE_COOKIE}=`))
  return match ? decodeURIComponent(match.slice(NOTION_OAUTH_STATE_COOKIE.length + 1)) : ''
}

export function consumeOAuthState(req, res, receivedState) {
  const expectedState = getOAuthStateFromRequest(req)
  res?.setHeader?.('Set-Cookie', clearOAuthStateCookie())

  if (!expectedState || !receivedState) return false
  const expected = Buffer.from(String(expectedState))
  const received = Buffer.from(String(receivedState))
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  )
}

export function buildNotionOAuthAuthorizeUrl({
  clientId,
  redirectUri,
  state,
  owner = 'user'
}) {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    owner,
    state
  })
  return `https://api.notion.com/v1/oauth/authorize?${query.toString()}`
}

export async function exchangeNotionOAuthCode(code) {
  const axios = (await import('axios')).default
  const clientId = process.env.OAUTH_CLIENT_ID
  const clientSecret = process.env.OAUTH_CLIENT_SECRET
  const redirectUri = process.env.OAUTH_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return {
      status: 500,
      statusText: 'OAuth configuration is missing',
      data: null
    }
  }

  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  try {
    const response = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_API_VERSION,
          Authorization: `Basic ${encoded}`
        }
      }
    )
    return response
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching token', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message
      })
    } else {
      console.error(
        'Error fetching token',
        error instanceof Error ? error.message : String(error)
      )
    }
    return {
      status: error?.response?.status || 502,
      statusText:
        error?.response?.data?.message ||
        error?.response?.statusText ||
        'Notion authorization request failed',
      data: null
    }
  }
}

export function buildSafeOAuthRedirectQuery(data) {
  const workspaceName = data?.workspace_name || ''
  const query = {
    msg: workspaceName ? `授权成功：${workspaceName}` : '授权成功'
  }

  if (workspaceName) query.workspace_name = workspaceName
  if (data?.workspace_id) query.workspace_id = data.workspace_id

  return query
}
