// pages/sitemap.xml.js
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import axios from 'axios'
import {
  buildSafeOAuthRedirectQuery,
  NOTION_API_VERSION
} from '@/lib/db/notion/oauth'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Slug from '../[prefix]'

/**
 * 根据notion的slug访问页面
 * 解析二级目录 /article/about
 * @param {*} props
 * @returns
 */
const UI = props => {
  const { redirect_pathname, redirect_query } = props
  const router = useRouter()
  useEffect(() => {
    router?.push({ pathname: redirect_pathname, query: redirect_query })
  }, [])
  return <Slug {...props} />
}

/**
 * 服务端接收参数处理
 * @param {*} ctx
 * @returns
 */
export const getServerSideProps = async ctx => {
  const from = `auth`
  const props = await fetchGlobalAllData({ from })
  delete props.allPages
  const code = ctx.query.code

  let params = null
  if (code) {
    params = await fetchToken(code)
  }

  // 授权成功的划保存下用户的workspace信息
  if (params?.status === 200) {
    props.redirect_query = buildSafeOAuthRedirectQuery(params.data)
    console.log('Notion OAuth token exchange succeeded', {
      workspaceId: params.data?.workspace_id,
      workspaceName: params.data?.workspace_name
    })
  } else if (!params) {
    console.log('请求异常', params)
    props.redirect_query = { msg: '无效请求' }
  } else {
    console.log('请求失败', params)
    props.redirect_query = { msg: params.statusText }
  }

  props.redirect_pathname = '/auth/result'

  return {
    props
  }
}

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
  }
}

export default UI
