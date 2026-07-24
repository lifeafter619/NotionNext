import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import worker from './worker.mjs'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('rejects paths outside the Notion image routes', async () => {
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }

  const response = await worker.fetch(new Request('https://cdn.example.com/'))

  assert.equal(response.status, 404)
  assert.equal(await response.text(), 'Not found')
  assert.equal(fetched, false)
})

test('rejects third-party URLs wrapped in the image route', async () => {
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }
  const external = 'https://images.example.com/cover.jpg'

  const response = await worker.fetch(
    new Request(
      `https://cdn.example.com/image/${encodeURIComponent(external)}?table=block&id=block-id`
    )
  )

  assert.equal(response.status, 404)
  assert.equal(fetched, false)
})

test('rejects third-party URLs wrapped in the signed file route', async () => {
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }
  const external = 'https://downloads.example.com/report.zip'

  const response = await worker.fetch(
    new Request(
      `https://cdn.example.com/signed/${encodeURIComponent(external)}`
    )
  )

  assert.equal(response.status, 404)
  assert.equal(fetched, false)
})

test('allows legacy Notion S3 image paths through the image route', async () => {
  let fetchedUrl
  globalThis.fetch = async url => {
    fetchedUrl = url.toString()
    return imageResponse()
  }
  const source =
    'https://s3-us-west-2.amazonaws.com/secure.notion-static.com/image-id/cover.png'

  const response = await worker.fetch(
    new Request(
      `https://cdn.example.com/image/${encodeURIComponent(source)}?table=block&id=block-id`
    )
  )

  assert.equal(response.status, 200)
  assert.match(fetchedUrl, /^https:\/\/www\.notion\.so\/image\//)
})

test('only allows GET and HEAD requests', async () => {
  const response = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg', {
      method: 'POST'
    })
  )

  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'GET, HEAD')
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0')
})

test('sorts query parameters and returns validated image responses', async () => {
  let fetchedUrl
  globalThis.fetch = async url => {
    fetchedUrl = url.toString()
    return imageResponse()
  }

  const response = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg?z=2&a=1')
  )

  assert.equal(fetchedUrl, 'https://www.notion.so/images/cover.jpg?a=1&z=2')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/png')
  assert.equal(response.headers.get('x-notion-image-proxy'), 'v7')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.match(response.headers.get('cache-control'), /immutable/)
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    new Uint8Array([1, 2, 3])
  )
})

test('does not turn a successful non-image response into a cacheable image', async () => {
  globalThis.fetch = async () =>
    new Response('<html>upstream error</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })

  const response = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg')
  )

  assert.equal(response.status, 502)
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0')
  assert.equal(response.headers.get('x-notion-image-proxy'), 'v7')
  assert.equal(await response.text(), 'Notion did not return an image')
})

test('proxies signed Notion files and preserves download metadata', async () => {
  let fetchedUrl
  let fetchedOptions
  globalThis.fetch = async (url, options) => {
    fetchedUrl = url.toString()
    fetchedOptions = options
    return new Response(new Uint8Array([4, 5, 6]), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="report.zip"',
        'Content-Length': '3',
        ETag: '"file-etag"'
      }
    })
  }

  const response = await worker.fetch(
    new Request(
      'https://cdn.example.com/signed/attachment%3Afile-id%3Areport.zip?table=block&id=block-id'
    )
  )

  assert.equal(
    fetchedUrl,
    'https://www.notion.so/signed/attachment%3Afile-id%3Areport.zip?id=block-id&table=block'
  )
  assert.equal(fetchedOptions.headers.Accept, '*/*')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/zip')
  assert.equal(
    response.headers.get('content-disposition'),
    'attachment; filename="report.zip"'
  )
  assert.equal(response.headers.get('access-control-allow-origin'), '*')
  assert.match(response.headers.get('cache-control'), /immutable/)
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    new Uint8Array([4, 5, 6])
  )
})

test('passes file ranges upstream without caching the partial response', async () => {
  let range
  let cacheEverything
  globalThis.fetch = async (_url, options) => {
    range = options.headers.Range
    cacheEverything = options.cf.cacheEverything
    return new Response(new Uint8Array([7, 8]), {
      status: 206,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Type': 'application/octet-stream',
        'Content-Length': '2',
        'Content-Range': 'bytes 0-1/8192'
      }
    })
  }

  const response = await worker.fetch(
    new Request(
      'https://cdn.example.com/signed/attachment%3Afile-id%3Adata.bin',
      {
        headers: { Range: 'bytes=0-1' }
      }
    )
  )

  assert.equal(range, 'bytes=0-1')
  assert.equal(cacheEverything, false)
  assert.equal(response.status, 206)
  assert.equal(response.headers.get('content-length'), '2')
  assert.equal(response.headers.get('content-range'), 'bytes 0-1/8192')
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0')
})

test('supports CORS preflight for file fallback probing', async () => {
  const response = await worker.fetch(
    new Request(
      'https://cdn.example.com/signed/attachment%3Afile-id%3Adata.bin',
      {
        method: 'OPTIONS'
      }
    )
  )

  assert.equal(response.status, 204)
  assert.equal(
    response.headers.get('access-control-allow-methods'),
    'GET, HEAD, OPTIONS'
  )
})

test('probes signed files with a one-byte GET because Notion rejects HEAD', async () => {
  let fetchedOptions
  globalThis.fetch = async (_url, options) => {
    fetchedOptions = options
    return new Response(new Uint8Array([7]), {
      status: 206,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Type': 'application/octet-stream',
        'Content-Length': '1',
        'Content-Range': 'bytes 0-0/8192'
      }
    })
  }

  const response = await worker.fetch(
    new Request(
      'https://cdn.example.com/signed/attachment%3Afile-id%3Adata.bin',
      {
        method: 'HEAD'
      }
    )
  )

  assert.equal(fetchedOptions.method, 'GET')
  assert.equal(fetchedOptions.headers.Range, 'bytes=0-0')
  assert.equal(fetchedOptions.cf.cacheEverything, false)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-length'), '8192')
  assert.equal(response.headers.get('content-range'), null)
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0')
})

test('honors matching ETag validators', async () => {
  globalThis.fetch = async () => imageResponse()

  const response = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg', {
      headers: { 'If-None-Match': 'W/"image-etag"' }
    })
  )

  assert.equal(response.status, 304)
  assert.equal(await response.text(), '')
})

function imageResponse() {
  return new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      ETag: '"image-etag"',
      'Last-Modified': 'Wed, 22 Jul 2026 00:00:00 GMT'
    }
  })
}
