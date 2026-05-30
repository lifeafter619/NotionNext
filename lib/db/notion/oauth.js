export const NOTION_API_VERSION = '2026-03-11'

export function buildSafeOAuthRedirectQuery(data) {
  const workspaceName = data?.workspace_name || ''
  const query = {
    msg: workspaceName ? `授权成功：${workspaceName}` : '授权成功'
  }

  if (workspaceName) query.workspace_name = workspaceName
  if (data?.workspace_id) query.workspace_id = data.workspace_id

  return query
}
