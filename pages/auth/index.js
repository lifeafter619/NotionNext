import {
  buildSafeOAuthRedirectQuery,
  consumeOAuthState,
  exchangeNotionOAuthCode
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
  const state = Array.isArray(ctx.query.state)
    ? ctx.query.state[0]
    : ctx.query.state

  if (!consumeOAuthState(ctx.req, ctx.res, state)) {
    return buildRedirectResult({ msg: '授权状态无效，请重新发起授权' })
  }

  let params = null
  if (code) {
    params = await exchangeNotionOAuthCode(code)
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

export default UI
