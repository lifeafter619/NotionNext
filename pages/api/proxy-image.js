import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { isNotionHostedAssetSource } from '@/lib/notionAssetUrl'

const MAX_REDIRECTS = 3
function createReadableStream(reader) {
  return new Readable({
    read() {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            this.push(null)
          } else {
            this.push(Buffer.from(value))
          }
        })
        .catch(error => {
          this.destroy(error)
        })
    }
  })
}

export default async function handler(req, res) {
  const { url, filename } = req.query

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  if (Array.isArray(url) || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid url parameter' })
  }

  try {
    const targetUrl = new URL(url)

    const validation = validateImageUrl(targetUrl)
    if (!validation.ok) {
      if (validation.error === 'Domain not allowed') {
        console.warn(`Blocked proxy attempt to: ${targetUrl.hostname}`)
        return res.status(403).json({ error: validation.error })
      }
      return res.status(400).json({ error: 'Protocol not allowed' })
    }

    const response = await fetchAllowedImage(targetUrl)

    if (!response.ok) {
      // If the upstream request failed, return JSON error, do not stream body as image
      return res
        .status(response.status)
        .json({ error: `Upstream error: ${response.statusText}` })
    }

    const contentType = response.headers.get('content-type')

    // Security: Validate content type
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid content type' })
    }

    // Determine safe filename and extension
    let finalFilename = normalizeFilename(filename)
    // Ensure filename has an extension derived from Content-Type if possible
    const extensionMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg'
    }

    // If filename has no extension or a weird one, append the correct one from MIME type
    const hasExtension = /\.[a-zA-Z0-9]{3,4}$/.test(finalFilename)
    if (!hasExtension || finalFilename.endsWith('.customize')) {
      const ext = extensionMap[contentType] || '.png'
      // Remove .customize if present
      finalFilename = finalFilename.replace(/\.customize$/, '')
      if (!finalFilename.endsWith(ext)) {
        finalFilename += ext
      }
    }

    // Encode filename for Content-Disposition (handling UTF-8)
    const contentDisposition = `attachment; filename="${encodeURIComponent(finalFilename)}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', contentDisposition)

    // Stream response
    if (response.body) {
      // Check if body is a web stream (Next.js environment)
      const reader = response.body.getReader()
      const stream = createReadableStream(reader)
      await pipeline(stream, res)
    } else {
      res.end()
    }
  } catch (error) {
    if (res.headersSent || res.destroyed || res.writableEnded) {
      console.error('Proxy stream error:', error)
      if (!res.destroyed && typeof res.destroy === 'function') {
        res.destroy(error)
      }
      return
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    console.error('Proxy error:', error)
    res.status(500).json({ error: 'Failed to proxy image' })
  }
}

async function fetchAllowedImage(initialUrl) {
  let currentUrl = initialUrl

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(currentUrl.toString(), { redirect: 'manual' })

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response
    }

    const location = response.headers.get('location')
    if (!location) {
      return response
    }

    const nextUrl = new URL(location, currentUrl)
    const validation = validateImageUrl(nextUrl)
    if (!validation.ok) {
      const error = new Error(validation.error)
      error.statusCode = validation.error === 'Domain not allowed' ? 403 : 400
      throw error
    }
    currentUrl = nextUrl
  }

  const error = new Error('Too many redirects')
  error.statusCode = 400
  throw error
}

function validateImageUrl(targetUrl) {
  if (targetUrl.protocol !== 'https:') {
    return { ok: false, error: 'Protocol not allowed' }
  }

  if (!isNotionHostedAssetSource(targetUrl.toString())) {
    return { ok: false, error: 'Domain not allowed' }
  }

  return { ok: true }
}

function normalizeFilename(filename) {
  const value = Array.isArray(filename) ? filename[0] : filename
  return typeof value === 'string' && value.trim() ? value : 'image'
}
