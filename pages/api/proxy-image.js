
import { Readable } from 'stream'

export default async function handler(req, res) {
  const { url, filename } = req.query

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  try {
    const targetUrl = new URL(url)

    // Security: Validate protocol
    if (targetUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Protocol not allowed' })
    }

    // Security: Validate hostname against allowed list to prevent SSRF
    // Notion images are usually hosted on notion.so, aws s3, or unsplash
    const ALLOWED_DOMAINS = [
      'notion.so',
      'file.notion.so',
      's3.us-west-2.amazonaws.com',
      'images.unsplash.com',
      'prod-files-secure.s3.us-west-2.amazonaws.com'
    ]

    // Check if the hostname ends with any of the allowed domains
    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
    )

    if (!isAllowed) {
       // Log the blocked attempt for debugging but return generic error
       console.warn(`Blocked proxy attempt to: ${targetUrl.hostname}`)
       return res.status(403).json({ error: 'Domain not allowed' })
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')

    // Security: Validate content type
    if (!contentType || !contentType.startsWith('image/')) {
       return res.status(400).json({ error: 'Invalid content type' })
    }

    const contentDisposition = `attachment; filename="${filename || 'image.png'}"`

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', contentDisposition)

    // Stream response
    if (response.body) {
      // Check if body is a web stream (Next.js environment)
      const reader = response.body.getReader()
      const stream = new Readable({
        async read() {
          const { done, value } = await reader.read()
          if (done) {
            this.push(null)
          } else {
            this.push(Buffer.from(value))
          }
        }
      })
      stream.pipe(res)
    } else {
      res.end()
    }

  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ error: 'Failed to proxy image' })
  }
}
