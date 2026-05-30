// pages/api/auth.js
import axios from 'axios'
import {
  buildSafeOAuthRedirectQuery,
  NOTION_API_VERSION
} from '@/lib/db/notion/oauth'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Notion授权返回结果
 */
export interface NotionTokenResponseData {
  access_token: string
  refresh_token?: string
  token_type: string
  bot_id: string
  workspace_name: string
  workspace_icon: string
  workspace_id: string
  owner: {
    type: string
    user: {
      object: string
      id: string
      name: string
      avatar_url: string
      type: string
      person: {
        email: string
      }
    }
  }
  duplicated_template_id: string | null
  request_id: string
}

export interface NotionTokenResponse {
  status: number
  statusText: string
  data: NotionTokenResponseData | null
}

/**
 * Notion授权回调
 * @param req
 * @param res
 * @returns
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const code = Array.isArray(req.query.code)
      ? req.query.code[0]
      : req.query.code

    if (!code) {
      return res.status(400).json({ error: 'Invalid request, code is missing' })
    }

    const params = await fetchToken(code)

    if (params?.status === 200) {
      const redirectQuery = buildSafeOAuthRedirectQuery(params.data)

      // 这里将用户数据写入到Notion数据库
      res.redirect(
        302,
        `/auth/result?${new URLSearchParams(redirectQuery).toString()}`
      )
    } else {
      const redirectQuery = { msg: params?.statusText || '请求异常' }
      res.redirect(
        302,
        `/auth/result?${new URLSearchParams(redirectQuery).toString()}`
      )
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
/**
 * 获取token
 * @param code
 * @returns
 */
const fetchToken = async (code: string): Promise<NotionTokenResponse> => {
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
    const response = await axios.post<NotionTokenResponseData>(
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
    console.log('Notion OAuth token exchange succeeded', {
      workspaceId: response.data.workspace_id,
      workspaceName: response.data.workspace_name
    })
    return {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    }
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
      status: 400,
      statusText: 'failed',
      data: null
    }
  }
}
