import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import notionAPI from '@/lib/db/notion/getNotionAPI'

const MAX_REDIRECTS = 3
const ALLOWED_FILE_DOMAINS = [
  'notion.so',
  'file.notion.so',
  'file.notion.com',
  'notionusercontent.com',
  'secure.notion-static.com',
  's3-us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  'prod-files-secure-euc1.s3.eu-central-1.amazonaws.com',
  'prod-files-secure-apne1.s3.ap-northeast-1.amazonaws.com',
  'prod-files-secure-apne2.s3.ap-northeast-2.amazonaws.com'
]

export const config = {
  api: {
    responseLimit: false
  }
}

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
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const id = getSingleQueryValue(req.query.id)
  const source = getSingleQueryValue(req.query.source)
  const filename = getSingleQueryValue(req.query.filename)

  if (!id || !source) {
    return res.status(400).json({ error: 'Missing id or source parameter' })
  }

  if (id.invalid || source.invalid || filename?.invalid) {
    return res.status(400).json({ error: 'Invalid query parameter' })
  }

  try {
    const normalizedSource = normalizeNotionFileSource(source.value)
    if (!isRefreshableNotionFileSource(normalizedSource)) {
      return res.status(400).json({ error: 'Unsupported source parameter' })
    }

    const signedUrl = await getFreshSignedUrl(id.value, normalizedSource)
    const targetUrl = new URL(signedUrl)
    const validation = validateAllowedFileUrl(targetUrl)
    if (!validation.ok) {
      return res
        .status(validation.error === 'Domain not allowed' ? 403 : 400)
        .json({ error: validation.error })
    }

    const response = await fetchAllowedFile(targetUrl)
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Upstream error: ${response.statusText}` })
    }

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream'
    const contentLength = response.headers.get('content-length')
    const finalFilename = normalizeFilename(
      filename?.value,
      inferFilename(normalizedSource) || inferFilename(signedUrl) || 'download'
    )

    res.setHeader('Content-Type', contentType)
    if (contentLength) res.setHeader('Content-Length', contentLength)
    res.setHeader('Content-Disposition', getContentDisposition(finalFilename))
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')

    if (req.method === 'HEAD') {
      if (response.body) {
        await response.body.cancel().catch(() => {})
      }
      return res.end()
    }

    if (response.body) {
      await pipeline(createReadableStream(response.body.getReader()), res)
    } else {
      res.end()
    }
  } catch (error) {
    if (res.headersSent || res.destroyed || res.writableEnded) {
      console.error('[notion-file] download stream failed:', error)
      if (!res.destroyed && typeof res.destroy === 'function') {
        res.destroy(error)
      }
      return
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    console.error('[notion-file] download failed:', error)
    return res.status(500).json({ error: 'Failed to download file' })
  }
}

async function getFreshSignedUrl(blockId, source) {
  const { signedUrls } = await notionAPI.getSignedFileUrls([
    {
      permissionRecord: {
        table: 'block',
        id: blockId
      },
      url: source
    }
  ])

  const signedUrl = signedUrls?.[0]
  if (!signedUrl || typeof signedUrl !== 'string') {
    const error = new Error('Unable to refresh file URL')
    error.statusCode = 502
    throw error
  }

  return signedUrl
}

async function fetchAllowedFile(initialUrl) {
  let currentUrl = initialUrl

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(currentUrl.toString(), { redirect: 'manual' })

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response
    }

    const location = response.headers.get('location')
    if (!location) return response

    const nextUrl = new URL(location, currentUrl)
    const validation = validateAllowedFileUrl(nextUrl)
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

function getSingleQueryValue(value) {
  if (value == null) return null
  if (Array.isArray(value)) return { invalid: true }
  if (typeof value !== 'string') return { invalid: true }

  const trimmed = value.trim()
  return trimmed ? { value: trimmed } : null
}

export function normalizeNotionFileSource(source) {
  if (typeof source !== 'string') return ''

  try {
    const url = new URL(source)
    const hostname = url.hostname.toLowerCase()
    if (
      (hostname === 'notion.so' || hostname === 'www.notion.so') &&
      url.pathname.startsWith('/signed/')
    ) {
      const encodedSource = url.pathname.slice('/signed/'.length)
      return decodeURIComponent(encodedSource)
    }
  } catch {
    // Non-URL attachment sources are valid and handled below.
  }

  return source
}

function isRefreshableNotionFileSource(source) {
  if (source.startsWith('attachment:')) return true

  try {
    const url = new URL(source)
    return validateAllowedFileUrl(url).ok
  } catch {
    return false
  }
}

function validateAllowedFileUrl(targetUrl) {
  if (targetUrl.protocol !== 'https:') {
    return { ok: false, error: 'Protocol not allowed' }
  }

  const hostname = targetUrl.hostname.toLowerCase()
  const isAllowed = ALLOWED_FILE_DOMAINS.some(
    domain => hostname === domain || hostname.endsWith(`.${domain}`)
  )

  if (!isAllowed) return { ok: false, error: 'Domain not allowed' }
  return { ok: true }
}

function inferFilename(source) {
  if (!source || typeof source !== 'string') return ''

  if (source.startsWith('attachment:')) {
    const parts = source.split(':')
    return parts[parts.length - 1] || ''
  }

  try {
    const url = new URL(source)
    return decodeURIComponent(
      url.pathname.split('/').filter(Boolean).pop() || ''
    )
  } catch {
    return ''
  }
}

function normalizeFilename(filename, fallback) {
  const value = (filename || fallback || 'download')
    .replace(/[\r\n"]/g, '')
    .replace(/[\\/]/g, '_')
    .trim()

  return value || 'download'
}

function getContentDisposition(filename) {
  const asciiName = filename.replace(/[^\x20-\x7e]/g, '_')
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}
