import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import worker from './worker.mjs'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  delete globalThis.caches
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

test('proxies only allowlisted Waline emoji package images', async () => {
  let fetchedUrl
  globalThis.fetch = async url => {
    fetchedUrl = url.toString()
    return imageResponse()
  }

  const response = await worker.fetch(
    new Request(
      'https://cdn.example.com/external/waline-emojis/1.2.0/tieba/tieba_agree.png'
    )
  )

  assert.equal(response.status, 200)
  assert.equal(
    fetchedUrl,
    'https://unpkg.com/@waline/emojis@1.2.0/tieba/tieba_agree.png'
  )
})

test('proxies Waline emoji metadata needed by the picker', async () => {
  let fetchedUrl
  globalThis.fetch = async url => {
    fetchedUrl = url.toString()
    return new Response('{"name":"Tieba","icon":"agree","items":[]}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const response = await worker.fetch(
    new Request(
      'https://cdn.example.com/external/waline-emojis/1.2.0/tieba/info.json'
    )
  )

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/json')
  assert.equal(
    fetchedUrl,
    'https://unpkg.com/@waline/emojis@1.2.0/tieba/info.json'
  )
})

test('rejects non-Waline packages on the external proxy route', async () => {
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }

  const response = await worker.fetch(
    new Request(
      'https://cdn.example.com/external/waline-emojis/1.2.0/other/private.png'
    )
  )

  assert.equal(response.status, 404)
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

  assert.equal(fetchedUrl, 'https://www.notion.so/images/cover.jpg?a=1&z=2')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/png')
  assert.equal(response.headers.get('x-notion-image-proxy'), 'v11')
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
  assert.equal(response.headers.get('x-notion-image-proxy'), 'v11')
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

test('stores validated responses in the edge cache and serves repeats locally', async () => {
  const { mockCaches, putUrls } = createMockCaches()
  globalThis.caches = mockCaches
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return imageResponse()
  }
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }

  const first = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    undefined,
    ctx
  )
  assert.equal(first.status, 200)
  assert.equal(first.headers.get('x-notion-image-proxy-edge-cache'), 'MISS')
  await first.arrayBuffer()
  await Promise.all(pending)
  assert.equal(putUrls.length, 1)

  const second = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    undefined,
    ctx
  )
  assert.equal(second.status, 200)
  assert.equal(second.headers.get('x-notion-image-proxy-edge-cache'), 'HIT')
  assert.equal(fetchCount, 1)
  assert.deepEqual(
    new Uint8Array(await second.arrayBuffer()),
    new Uint8Array([1, 2, 3])
  )
})

test('normalizes query parameter order for edge cache keys', async () => {
  const { mockCaches } = createMockCaches()
  globalThis.caches = mockCaches
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return imageResponse()
  }
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }

  const first = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg?z=2&a=1'),
    undefined,
    ctx
  )
  await first.arrayBuffer()
  await Promise.all(pending)

  const second = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg?a=1&z=2'),
    undefined,
    ctx
  )

  assert.equal(second.headers.get('x-notion-image-proxy-edge-cache'), 'HIT')
  assert.equal(fetchCount, 1)
})

test('never stores upstream error responses in the edge cache', async () => {
  const { mockCaches, putUrls } = createMockCaches()
  globalThis.caches = mockCaches
  globalThis.fetch = async () =>
    new Response('<html>upstream error</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }

  const response = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    undefined,
    ctx
  )
  await Promise.all(pending)

  assert.equal(response.status, 502)
  assert.equal(putUrls.length, 0)
})

test('bypasses the edge cache for range requests', async () => {
  const { mockCaches, matchUrls } = createMockCaches()
  globalThis.caches = mockCaches
  globalThis.fetch = async () =>
    new Response(new Uint8Array([7, 8]), {
      status: 206,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Type': 'application/octet-stream',
        'Content-Length': '2',
        'Content-Range': 'bytes 0-1/8192'
      }
    })

  const response = await worker.fetch(
    new Request(
      'https://cdn.example.com/signed/attachment%3Afile-id%3Adata.bin',
      { headers: { Range: 'bytes=0-1' } }
    )
  )

  assert.equal(response.status, 206)
  assert.equal(matchUrls.length, 0)
})

test('retries past a poisoned cached upstream error and returns the live asset', async () => {
  const fetchCalls = []
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url: url.toString(), options })
    if (fetchCalls.length === 1) {
      return new Response('<html>cached upstream error</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html', 'CF-Cache-Status': 'HIT' }
      })
    }
    return imageResponse()
  }

  const response = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg')
  )

  assert.equal(fetchCalls.length, 2)
  assert.equal(fetchCalls[1].options.cf.cacheTtl, -1)
  assert.equal(fetchCalls[1].options.cf.cacheEverything, false)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/png')
  assert.equal(
    response.headers.get('x-notion-image-proxy-origin-cache'),
    'BYPASS-RETRY'
  )
})

test('does not retry genuine uncached upstream errors', async () => {
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return new Response('<html>live upstream error</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html', 'CF-Cache-Status': 'MISS' }
    })
  }

  const response = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg')
  )

  assert.equal(fetchCount, 1)
  assert.equal(response.status, 502)
})

test('uses a plan-safe forced edge TTL on the upstream fetch', async () => {
  let fetchedOptions
  globalThis.fetch = async (_url, options) => {
    fetchedOptions = options
    return imageResponse()
  }

  await worker.fetch(new Request('https://cdn.example.com/images/cover.jpg'))

  assert.equal(fetchedOptions.cf.cacheEverything, true)
  assert.equal(fetchedOptions.cf.cacheTtl, 60 * 60 * 24 * 30)
})

test('stores validated assets in R2 and serves the next request from R2', async () => {
  const { bucket, putCalls } = createMockBucket()
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return imageResponseWithLength()
  }
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }
  const env = { ASSET_BUCKET: bucket }

  const first = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    env,
    ctx
  )
  assert.equal(first.status, 200)
  assert.equal(first.headers.get('x-notion-image-proxy-edge-cache'), 'MISS')
  await first.arrayBuffer()
  await Promise.all(pending)
  assert.equal(putCalls.length, 1)
  assert.match(putCalls[0].key, /^v1\/[0-9a-f]{64}$/)
  assert.equal(putCalls[0].options.httpMetadata.contentType, 'image/png')

  const second = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    env,
    ctx
  )
  assert.equal(fetchCount, 1)
  assert.equal(second.status, 200)
  assert.equal(second.headers.get('x-notion-image-proxy-edge-cache'), 'R2-HIT')
  assert.equal(second.headers.get('x-notion-image-proxy-origin-cache'), 'R2')
  assert.equal(second.headers.get('content-type'), 'image/png')
  assert.equal(second.headers.get('etag'), '"image-etag"')
  assert.deepEqual(
    new Uint8Array(await second.arrayBuffer()),
    new Uint8Array([1, 2, 3])
  )
})

test('shares one R2 object across every bound hostname', async () => {
  const { bucket } = createMockBucket()
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return imageResponseWithLength()
  }
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }
  const env = { ASSET_BUCKET: bucket }

  const first = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    env,
    ctx
  )
  await first.arrayBuffer()
  await Promise.all(pending)

  const second = await worker.fetch(
    new Request('https://alt-cdn.example.org/images/cover.jpg'),
    env,
    ctx
  )

  assert.equal(fetchCount, 1)
  assert.equal(second.headers.get('x-notion-image-proxy-edge-cache'), 'R2-HIT')
})

test('skips R2 storage when the upstream length is unknown', async () => {
  const { bucket, putCalls } = createMockBucket()
  globalThis.fetch = async () => imageResponse()
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }

  const response = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    { ASSET_BUCKET: bucket },
    ctx
  )
  await response.arrayBuffer()
  await Promise.all(pending)

  assert.equal(response.status, 200)
  assert.equal(putCalls.length, 0)
})

test('skips R2 storage for assets above the size cap', async () => {
  const { bucket, putCalls } = createMockBucket()
  globalThis.fetch = async () =>
    new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(500 * 1024 * 1024)
      }
    })
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }

  const response = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    { ASSET_BUCKET: bucket },
    ctx
  )
  await response.arrayBuffer()
  await Promise.all(pending)

  assert.equal(response.status, 200)
  assert.equal(putCalls.length, 0)
})

test('serves 304 from R2 for matching validators', async () => {
  const { bucket } = createMockBucket()
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return imageResponseWithLength()
  }
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }
  const env = { ASSET_BUCKET: bucket }

  const first = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    env,
    ctx
  )
  await first.arrayBuffer()
  await Promise.all(pending)

  const revalidation = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg', {
      headers: { 'If-None-Match': '"image-etag"' }
    }),
    env,
    ctx
  )

  assert.equal(fetchCount, 1)
  assert.equal(revalidation.status, 304)
  assert.equal(await revalidation.text(), '')
})

test('an R2 hit repopulates the local colo cache', async () => {
  const primingCaches = createMockCaches()
  globalThis.caches = primingCaches.mockCaches
  const { bucket } = createMockBucket()
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return imageResponseWithLength()
  }
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }
  const env = { ASSET_BUCKET: bucket }

  const first = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    env,
    ctx
  )
  await first.arrayBuffer()
  await Promise.all(pending)
  pending.length = 0

  // 换一个空的 colo 缓存，模拟另一个机房首次收到请求
  const freshCaches = createMockCaches()
  globalThis.caches = freshCaches.mockCaches

  const second = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    env,
    ctx
  )
  assert.equal(second.headers.get('x-notion-image-proxy-edge-cache'), 'R2-HIT')
  await second.arrayBuffer()
  await Promise.all(pending)
  assert.equal(freshCaches.putUrls.length, 1)

  const third = await worker.fetch(
    new Request('https://cdn.example.com/images/cover.jpg'),
    env,
    ctx
  )
  assert.equal(third.headers.get('x-notion-image-proxy-edge-cache'), 'HIT')
  assert.equal(fetchCount, 1)
})

test('serves uploaded bucket files on the /f/ route without touching Notion', async () => {
  const { bucket, objects } = createMockBucket()
  objects.set('demo.png', {
    body: new Uint8Array([9, 9, 9]),
    httpMetadata: { contentType: 'image/png' },
    httpEtag: '"upload-etag"'
  })
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }

  const response = await worker.fetch(
    new Request('https://cdn.example.com/f/demo.png'),
    { ASSET_BUCKET: bucket }
  )

  assert.equal(fetched, false)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/png')
  assert.equal(response.headers.get('etag'), '"upload-etag"')
  assert.equal(
    response.headers.get('x-notion-image-proxy-origin-cache'),
    'R2-FILE'
  )
  assert.match(response.headers.get('cache-control'), /max-age=86400/)
  assert.doesNotMatch(response.headers.get('cache-control'), /immutable/)
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    new Uint8Array([9, 9, 9])
  )
})

test('decodes encoded /f/ keys and guesses the content type', async () => {
  const { bucket, objects } = createMockBucket()
  objects.set('相册/照片.webp', {
    body: new Uint8Array([1]),
    httpMetadata: {},
    httpEtag: '"cjk-etag"'
  })
  globalThis.fetch = async () => imageResponse()

  const response = await worker.fetch(
    new Request(
      'https://cdn.example.com/f/%E7%9B%B8%E5%86%8C/%E7%85%A7%E7%89%87.webp'
    ),
    { ASSET_BUCKET: bucket }
  )

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/webp')
})

test('returns 404 for missing uploads and hides the cache namespace', async () => {
  const { bucket, objects } = createMockBucket()
  objects.set('v1/secret-cache-entry', {
    body: new Uint8Array([1]),
    httpMetadata: {},
    httpEtag: '"hidden"'
  })
  globalThis.fetch = async () => imageResponse()

  const missing = await worker.fetch(
    new Request('https://cdn.example.com/f/missing.png'),
    { ASSET_BUCKET: bucket }
  )
  const hidden = await worker.fetch(
    new Request('https://cdn.example.com/f/v1/secret-cache-entry'),
    { ASSET_BUCKET: bucket }
  )
  const unconfigured = await worker.fetch(
    new Request('https://cdn.example.com/f/demo.png')
  )

  assert.equal(missing.status, 404)
  assert.equal(hidden.status, 404)
  assert.equal(unconfigured.status, 404)
})

test('serves 304 for matching /f/ etags', async () => {
  const { bucket, objects } = createMockBucket()
  objects.set('demo.png', {
    body: new Uint8Array([9, 9, 9]),
    httpMetadata: { contentType: 'image/png' },
    httpEtag: '"upload-etag"'
  })
  globalThis.fetch = async () => imageResponse()

  const response = await worker.fetch(
    new Request('https://cdn.example.com/f/demo.png', {
      headers: { 'If-None-Match': '"upload-etag"' }
    }),
    { ASSET_BUCKET: bucket }
  )

  assert.equal(response.status, 304)
  assert.equal(await response.text(), '')
})

test('caches /f/ responses in the local colo cache', async () => {
  const { mockCaches, putUrls } = createMockCaches()
  globalThis.caches = mockCaches
  const { bucket, objects } = createMockBucket()
  objects.set('demo.png', {
    body: new Uint8Array([9, 9, 9]),
    httpMetadata: { contentType: 'image/png' },
    httpEtag: '"upload-etag"'
  })
  globalThis.fetch = async () => imageResponse()
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise) }
  const env = { ASSET_BUCKET: bucket }

  const first = await worker.fetch(
    new Request('https://cdn.example.com/f/demo.png'),
    env,
    ctx
  )
  assert.equal(first.headers.get('x-notion-image-proxy-edge-cache'), 'MISS')
  await first.arrayBuffer()
  await Promise.all(pending)
  assert.equal(putUrls.length, 1)

  const second = await worker.fetch(
    new Request('https://cdn.example.com/f/demo.png'),
    env,
    ctx
  )
  assert.equal(second.headers.get('x-notion-image-proxy-edge-cache'), 'HIT')
  assert.deepEqual(
    new Uint8Array(await second.arrayBuffer()),
    new Uint8Array([9, 9, 9])
  )
})

test('proxies Notion builtin icon svgs with immutable caching', async () => {
  let fetchedUrl
  globalThis.fetch = async url => {
    fetchedUrl = url.toString()
    return new Response('<svg/>', {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' }
    })
  }

  const response = await worker.fetch(
    new Request('https://cdn.example.com/icons/downward_blue.svg')
  )

  assert.equal(fetchedUrl, 'https://www.notion.so/icons/downward_blue.svg')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/svg+xml')
  assert.match(response.headers.get('cache-control'), /immutable/)
})

test('rejects icon paths that are not simple svg filenames', async () => {
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }

  for (const path of [
    '/icons/../secret',
    '/icons/evil.png',
    '/icons/a/b.svg',
    '/icons/'
  ]) {
    const response = await worker.fetch(
      new Request(`https://cdn.example.com${path}`)
    )
    assert.equal(response.status, 404, path)
  }
  assert.equal(fetched, false)
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

function imageResponseWithLength() {
  return new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': '3',
      ETag: '"image-etag"',
      'Last-Modified': 'Wed, 22 Jul 2026 00:00:00 GMT'
    }
  })
}

function createMockBucket() {
  const objects = new Map()
  const putCalls = []
  const bucket = {
    async get(key) {
      const entry = objects.get(key)
      if (!entry) return null
      return {
        body: new Response(entry.body.slice(0)).body,
        size: entry.body.length,
        httpMetadata: entry.httpMetadata,
        customMetadata: entry.customMetadata,
        httpEtag: entry.httpEtag
      }
    },
    async put(key, value, options) {
      putCalls.push({ key, options })
      const bytes = new Uint8Array(await new Response(value).arrayBuffer())
      objects.set(key, {
        body: bytes,
        httpMetadata: options?.httpMetadata,
        customMetadata: options?.customMetadata
      })
    }
  }
  return { bucket, objects, putCalls }
}

function createMockCaches() {
  const store = new Map()
  const putUrls = []
  const matchUrls = []
  const cache = {
    async match(request) {
      matchUrls.push(request.url)
      const entry = store.get(request.url)
      if (!entry) return undefined
      return new Response(entry.body.slice(0), {
        status: entry.status,
        headers: new Headers(entry.headers)
      })
    },
    async put(request, response) {
      putUrls.push(request.url)
      const body = new Uint8Array(await response.arrayBuffer())
      store.set(request.url, {
        body,
        status: response.status,
        headers: [...response.headers]
      })
    }
  }
  return { mockCaches: { default: cache }, store, putUrls, matchUrls }
}

// --- 防盗链 (Referer allow-list) ---

function requestWithReferer(referer, url = 'https://cdn.example.com/images/cover.jpg') {
  const headers = {}
  if (referer !== undefined) headers.Referer = referer
  return new Request(url, { headers })
}

test('hotlink protection allows requests with no Referer', async () => {
  // NotionNext 站点请求默认 referrerPolicy='no-referrer'，无 Referer 必须放行
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }

  const response = await worker.fetch(requestWithReferer(undefined))

  assert.equal(fetched, true)
  assert.equal(response.status, 200)
})

test('hotlink protection allows allow-listed domains by default', async () => {
  for (const referer of [
    'https://619.pp.ua/',
    'https://66619.eu.org/article/x',
    'https://619-project.eu.org/',
    'http://localhost:3000/',
    'http://127.0.0.1:3000/'
  ]) {
    let fetched = false
    globalThis.fetch = async () => {
      fetched = true
      return imageResponse()
    }

    const response = await worker.fetch(requestWithReferer(referer))

    assert.equal(fetched, true, `expected fetch for referer ${referer}`)
    assert.equal(response.status, 200, `expected 200 for referer ${referer}`)
  }
})

test('hotlink protection allows subdomains of allow-listed domains', async () => {
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }

  const response = await worker.fetch(
    requestWithReferer('https://www.619.pp.ua/')
  )

  assert.equal(fetched, true)
  assert.equal(response.status, 200)
})

test('hotlink protection rejects third-party Referers with 403', async () => {
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }

  const response = await worker.fetch(
    requestWithReferer('https://evil.com/blog/stolen.html')
  )

  assert.equal(fetched, false, 'upstream must not be hit for a blocked referer')
  assert.equal(response.status, 403)
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0')
  assert.equal(await response.text(), 'Hotlinking not allowed')
})

test('hotlink protection does not let a third-party spoof a suffix match', async () => {
  // evil-619.pp.ua must NOT match the 619.pp.ua rule (no dot boundary)
  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }

  const response = await worker.fetch(
    requestWithReferer('https://evil-619.pp.ua/')
  )

  assert.equal(fetched, false)
  assert.equal(response.status, 403)
})

test('hotlink protection applies to the /f/ direct-read route too', async () => {
  // /f/ 路由同样受防盗链保护：无 Referer 放行（本站请求）
  const { bucket } = createMockBucket()
  await bucket.put('demo.png', new Uint8Array([1, 2, 3]), {
    httpMetadata: { contentType: 'image/png' }
  })

  const response = await worker.fetch(
    new Request('https://cdn.example.com/f/demo.png'),
    { ASSET_BUCKET: bucket }
  )

  assert.equal(response.status, 200)
})

test('hotlink protection rejects third-party Referers on /f/ route', async () => {
  const { bucket } = createMockBucket()
  await bucket.put('demo.png', new Uint8Array([1, 2, 3]), {
    httpMetadata: { contentType: 'image/png' }
  })

  const response = await worker.fetch(
    new Request('https://cdn.example.com/f/demo.png', {
      headers: { Referer: 'https://evil.com/' }
    }),
    { ASSET_BUCKET: bucket }
  )

  assert.equal(response.status, 403)
})

test('ALLOWED_DOMAINS env var overrides the default allow-list', async () => {
  // 配置自定义白名单后，默认域名应被拒、自定义域名应放行
  const env = { ALLOWED_DOMAINS: 'allowed.example.com,localhost' }

  let fetched = false
  globalThis.fetch = async () => {
    fetched = true
    return imageResponse()
  }
  const allowed = await worker.fetch(
    requestWithReferer('https://allowed.example.com/'),
    env
  )
  assert.equal(allowed.status, 200)
  assert.equal(fetched, true)

  fetched = false
  const blocked = await worker.fetch(
    requestWithReferer('https://619.pp.ua/'),
    env
  )
  assert.equal(blocked.status, 403)
  assert.equal(fetched, false)
})

