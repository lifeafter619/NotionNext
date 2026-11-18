import { isIP } from 'node:net'
import { getClientIp } from '@/lib/middleware/security'

const BAIDU_LOCATION_URL = 'https://api.map.baidu.com/location/ip'
const REQUEST_TIMEOUT_MS = 4000

function normalizeIp(value) {
  const ip = String(value || '').trim()
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ak = process.env.BAIDU_MAP_AK
  if (!ak) {
    return res.status(503).json({ error: 'Location service is not configured' })
  }

  const ip = normalizeIp(getClientIp(req))
  if (!isIP(ip)) {
    return res.status(400).json({ error: 'Valid visitor IP is required' })
  }

  const url = new URL(BAIDU_LOCATION_URL)
  url.searchParams.set('ak', ak)
  url.searchParams.set('ip', ip)
  url.searchParams.set('coor', 'bd09ll')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      return res.status(502).json({ error: 'Location service unavailable' })
    }

    const data = await response.json()
    const detail = data?.content?.address_detail
    const city =
      detail?.city || detail?.province || detail?.district || detail?.nation
    if (Number(data?.status) !== 0 || !city) {
      return res.status(502).json({ error: 'Location lookup failed' })
    }

    return res.status(200).json({ city })
  } catch (error) {
    const status = error?.name === 'AbortError' ? 504 : 502
    return res.status(status).json({ error: 'Location service unavailable' })
  } finally {
    clearTimeout(timeoutId)
  }
}
