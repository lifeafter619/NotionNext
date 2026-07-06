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
        return res.status(response.status >= 500 ? 502 : 400).json({
          status: 'error',
          message: data?.detail || data?.title || 'Subscription failed!'
        })
      }
      res
        .status(200)
        .json({ status: 'success', message: 'Subscription successful!' })
    } catch (error) {
      console.error('Subscription error:', error)
      res.status(error.statusCode || 400).json({
        status: 'error',
        message: error.message || 'Subscription failed!'
      })
    }
  } else {
    res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }
}
