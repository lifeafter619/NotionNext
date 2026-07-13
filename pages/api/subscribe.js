import subscribeToMailchimpApi from '@/lib/plugins/mailchimp'

/**
 * 接受邮件订阅
 * @param {*} req
 * @param {*} res
 */
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, firstName, lastName, first_name, last_name } = req.body || {}
    try {
      const response = await subscribeToMailchimpApi({
        email,
        first_name: firstName ?? first_name,
        last_name: lastName ?? last_name
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const responseStatus =
          response.status === 429
            ? 429
            : response.status >= 500 ||
                [401, 403, 404].includes(response.status)
              ? 502
              : 400
        return res.status(responseStatus).json({
          status: 'error',
          message: data?.detail || data?.title || 'Subscription failed!'
        })
      }
      res
        .status(200)
        .json({ status: 'success', message: 'Subscription successful!' })
    } catch (error) {
      console.error('Subscription error:', error)
      const statusCode = Number(error?.statusCode)
      res
        .status(
          Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
            ? statusCode
            : 502
        )
        .json({
          status: 'error',
          message: error?.message || 'Subscription failed!'
        })
    }
  } else {
    res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }
}
