import net from 'net'
import * as dns from 'dns'
import http from 'http'
import https from 'https'

const REQUEST_TIMEOUT_MS = 10000
const BLOCKED_HEADER_NAMES = new Set([
  'accept-encoding',
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
])

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '256kb'
    },
    responseLimit: '1mb'
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.'
    })
  }

  const { url, payload = {}, headers = {} } = req.body || {}

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing url'
    })
  }

  let targetUrl
  try {
    targetUrl = new URL(url)
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid url'
    })
  }

  const validation = await validateWebhookUrl(targetUrl)
  if (!validation.ok) {
    return res.status(400).json({
      success: false,
      error: validation.error
    })
  }

  try {
    const response = await postWebhookRequest({
      targetUrl,
      resolvedAddress: validation.address,
      headers: sanitizeHeaders(headers),
      body: JSON.stringify(payload)
    })

    return res.status(response.ok ? 200 : 502).json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    })
  } catch (error) {
    console.error('[webhook-proxy] request failed:', error)
    return res.status(502).json({
      success: false,
      error: 'Webhook request failed'
    })
  }
}

function postWebhookRequest({ targetUrl, resolvedAddress, headers, body }) {
  return new Promise((resolve, reject) => {
    const isHttps = targetUrl.protocol === 'https:'
    const transport = isHttps ? https : http
    const hostname = normalizeHostname(targetUrl.hostname)
    const request = transport.request(
      {
        protocol: targetUrl.protocol,
        hostname: resolvedAddress,
        port: targetUrl.port || (isHttps ? 443 : 80),
        method: 'POST',
        path: `${targetUrl.pathname}${targetUrl.search}`,
        headers: {
          ...headers,
          Host: targetUrl.host,
          'Content-Length': Buffer.byteLength(body)
        },
        servername: isHttps && !net.isIP(hostname) ? hostname : undefined,
        timeout: REQUEST_TIMEOUT_MS
      },
      upstreamResponse => {
        upstreamResponse.resume()
        upstreamResponse.on('end', () => {
          const status = upstreamResponse.statusCode || 0
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: upstreamResponse.statusMessage || ''
          })
        })
      }
    )

    request.on('timeout', () => {
      request.destroy(new Error('Webhook request timed out'))
    })
    request.on('error', reject)
    request.write(body)
    request.end()
  })
}

async function validateWebhookUrl(targetUrl) {
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return { ok: false, error: 'Protocol not allowed' }
  }

  if (targetUrl.username || targetUrl.password) {
    return { ok: false, error: 'URL credentials are not allowed' }
  }

  const hostname = normalizeHostname(targetUrl.hostname.toLowerCase())
  if (isLocalHostname(hostname)) {
    return { ok: false, error: 'Local webhook hosts are not allowed' }
  }

  if (isBlockedIp(hostname)) {
    return { ok: false, error: 'Private webhook addresses are not allowed' }
  }

  if (net.isIP(hostname)) {
    return { ok: true, address: hostname }
  }

  let addresses
  try {
    addresses = await dns.promises.lookup(hostname, {
      all: true,
      verbatim: true
    })
  } catch {
    return { ok: false, error: 'Unable to resolve webhook host' }
  }

  if (!addresses.length) {
    return { ok: false, error: 'Unable to resolve webhook host' }
  }

  const hasBlockedAddress = addresses.some(({ address }) => isBlockedIp(address))
  if (hasBlockedAddress) {
    return { ok: false, error: 'Private webhook addresses are not allowed' }
  }

  return { ok: true, address: addresses[0].address }
}

function sanitizeHeaders(headers) {
  const sanitized = {
    'Content-Type': 'application/json'
  }

  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return sanitized
  }

  Object.entries(headers).forEach(([name, value]) => {
    if (typeof name !== 'string' || typeof value !== 'string') return

    const trimmedName = name.trim()
    const normalizedName = trimmedName.toLowerCase()
    if (!trimmedName || BLOCKED_HEADER_NAMES.has(normalizedName)) return

    if (normalizedName === 'content-type') {
      sanitized['Content-Type'] = 'application/json'
      return
    }

    sanitized[trimmedName] = value
  })

  return sanitized
}

function isLocalHostname(hostname) {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '0' ||
    hostname === '0.0.0.0'
  )
}

function normalizeHostname(hostname) {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1)
  }

  return hostname
}

function isBlockedIp(value) {
  const ipVersion = net.isIP(value)
  if (ipVersion === 4) return isBlockedIpv4(value)
  if (ipVersion === 6) return isBlockedIpv6(value)
  return false
}

function isBlockedIpv4(address) {
  const parts = address.split('.').map(Number)
  const [a, b] = parts

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isBlockedIpv6(address) {
  const normalized = address.toLowerCase()
  if (normalized.startsWith('::ffff:')) {
    return true
  }

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('ff') ||
    normalized.startsWith('2001:db8:')
  )
}
