import axios from 'axios'
import {
  buildSafeOAuthRedirectQuery,
  NOTION_API_VERSION
} from '@/lib/db/notion/oauth'
const UI = () => null

/**
 * 服务端接收参数处理
 * @param {*} ctx
 * @returns
 */
export const getServerSideProps = async ctx => {
  const code = Array.isArray(ctx.query.code)
    ? ctx.query.code[0]
    : ctx.query.code

  let params = null
  if (code) {
    params = await fetchToken(code)
  }

  // 授权成功的划保存下用户的workspace信息
  if (params?.status === 200) {
    const redirectQuery = buildSafeOAuthRedirectQuery(params.data)
    console.log('Notion OAuth token exchange succeeded', {
      workspaceId: params.data?.workspace_id,
      workspaceName: params.data?.workspace_name
    })
    return buildRedirectResult(redirectQuery)
  } else if (!params) {
    return buildRedirectResult({ msg: '无效请求' })
  } else {
    return buildRedirectResult({ msg: params.statusText || '授权失败' })
  }
}

const buildRedirectResult = query => ({
  redirect: {
    destination: `/auth/result?${new URLSearchParams(query).toString()}`,
    permanent: false
  }
})

const fetchToken = async code => {
  if (!code) {
    return '无效请求'
  }
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

  // encode in base 64
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    const response = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      {
        grant_type: 'authorization_code',
        code: code,
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

export default UI
