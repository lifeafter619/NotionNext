import BLOG from '@/blog.config'

/**
 * 订阅邮件-服务端接口
 * @param {*} email
 * @returns
 */
export default function subscribeToMailchimpApi({
  email,
  first_name = '',
  last_name = ''
}) {
  const listId = BLOG.MAILCHIMP_LIST_ID // 替换为你的邮件列表 ID
  const apiKey = BLOG.MAILCHIMP_API_KEY // 替换为你的 API KEY
  if (!email) {
    const error = new Error('Email is required')
    error.statusCode = 400
    throw error
  }
  if (!listId || !apiKey) {
    const error = new Error('Mailchimp is not configured')
    error.statusCode = 503
    throw error
  }
  const apiKeyServerPrefix = apiKey.includes('-') ? apiKey.split('-').pop() : ''
  const serverPrefix =
    BLOG.MAILCHIMP_SERVER_PREFIX || apiKeyServerPrefix || 'us18'
  const data = {
    email_address: email,
    status: 'subscribed',
    merge_fields: {
      FNAME: first_name,
      LNAME: last_name
    }
  }
  return fetch(
    `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`,
    {
      method: 'POST',
      headers: {
        Authorization: `apikey ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  )
}

/**
 * 客户端接口
 * @param {*} email
 * @param {*} firstName
 * @param {*} lastName
 * @returns
 */
export async function subscribeToNewsletter(email, firstName, lastName) {
  const response = await fetch('/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, first_name: firstName, last_name: lastName })
  })
  const data = await response.json()
  return data
}
