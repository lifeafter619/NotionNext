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

  assert.equal(
    fetchedUrl,
    'https://www.notion.so/images/cover.jpg?a=1&z=2'
  )
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/png')
  assert.equal(response.headers.get('x-notion-image-proxy'), 'v4')
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
  assert.equal(response.headers.get('x-notion-image-proxy'), 'v4')
  assert.equal(await response.text(), 'Notion did not return an image')
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
