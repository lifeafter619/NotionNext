import { ReadableStream } from 'node:stream/web'
import { Writable } from 'node:stream'
import handler from '@/pages/api/proxy-image'

function createResponse() {
  const chunks = []
  let hasJsonBody = false
  const res = new Writable({
    write(chunk, _encoding, callback) {
      res.headersSent = true
      chunks.push(Buffer.from(chunk))
      callback()
    },
    final(callback) {
      if (!hasJsonBody) {
        res.body = Buffer.concat(chunks)
      }
      callback()
    }
  })

  res.statusCode = 200
  res.headers = {}
  res.headersSent = false
  res.body = undefined
  res.setHeader = jest.fn((name, value) => {
    res.headers[name.toLowerCase()] = value
  })
  res.status = jest.fn(code => {
    res.statusCode = code
    return res
  })
  res.json = jest.fn(payload => {
    hasJsonBody = true
    res.body = payload
    res.headersSent = true
    res.end()
    return res
  })

  return res
}

function createImageResponse(body = createSuccessfulBody()) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: jest.fn(name =>
        name.toLowerCase() === 'content-type' ? 'image/png' : null
      )
    },
    body
  }
}

function createSuccessfulBody() {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]))
      controller.close()
    }
  })
}

function createFailingBody(error) {
  let sentFirstChunk = false
  return new ReadableStream({
    pull(controller) {
      if (!sentFirstChunk) {
        sentFirstChunk = true
        controller.enqueue(new Uint8Array([1]))
        return
      }
      controller.error(error)
    }
  })
}

function createRedirectResponse(location) {
  return {
    ok: false,
    status: 302,
    statusText: 'Found',
    headers: {
      get: jest.fn(name =>
        name.toLowerCase() === 'location' ? location : null
      )
    },
    body: null
  }
}

describe('/api/proxy-image', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(createImageResponse())
  })

  it('rejects repeated url query parameters instead of stringifying them', async () => {
    const res = createResponse()

    await handler(
      {
        query: {
          url: [
            'https://secure.notion-static.com/image-id/photo.png',
            'https://evil.test/a.png'
          ]
        }
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({ error: 'Invalid url parameter' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('uses the first filename query value when repeated filename parameters are present', async () => {
    const res = createResponse()

    await handler(
      {
        query: {
          url: 'https://secure.notion-static.com/image-id/photo.png',
          filename: ['cover', 'ignored']
        }
      },
      res
    )

    expect(res.status).not.toHaveBeenCalledWith(500)
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="cover.png"; filename*=UTF-8\'\'cover.png'
    )
  })

  it('blocks redirects to disallowed image proxy domains', async () => {
    global.fetch.mockResolvedValueOnce(
      createRedirectResponse('https://evil.test/a.png')
    )
    const res = createResponse()

    await handler(
      {
        query: {
          url: 'https://secure.notion-static.com/image-id/photo.png'
        }
      },
      res
    )

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://secure.notion-static.com/image-id/photo.png',
      expect.objectContaining({ redirect: 'manual' })
    )
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toMatchObject({ error: 'Domain not allowed' })
  })

  it('destroys the response when the upstream image stream fails after sending data', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const streamError = new Error('upstream stream failed')
    global.fetch.mockResolvedValueOnce(
      createImageResponse(createFailingBody(streamError))
    )
    const res = createResponse()
    const destroySpy = jest.spyOn(res, 'destroy')

    await expect(
      handler(
        {
          query: {
            url: 'https://secure.notion-static.com/image-id/photo.png'
          }
        },
        res
      )
    ).resolves.toBeUndefined()

    expect(destroySpy).toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('rejects ordinary third-party image URLs', async () => {
    const res = createResponse()

    await handler(
      {
        query: {
          url: 'https://images.unsplash.com/photo.png'
        }
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(403)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('rejects Notion image wrappers whose inner source is third-party', async () => {
    const external = 'https://images.example.com/photo.png'
    const res = createResponse()

    await handler(
      {
        query: {
          url: `https://www.notion.so/image/${encodeURIComponent(external)}?table=block&id=block-id`
        }
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(403)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
