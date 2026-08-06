import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Compatibility callback. Token exchange is handled only by /auth so the
 * state validation and credential handling cannot diverge between routes.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const query = new URLSearchParams()
  for (const key of ['code', 'state', 'error', 'error_description']) {
    const value = req.query[key]
    const normalized = Array.isArray(value) ? value[0] : value
    if (normalized) query.set(key, normalized)
  }

  const suffix = query.toString()
  return res.redirect(307, suffix ? `/auth?${suffix}` : '/auth')
}
