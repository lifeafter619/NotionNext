import { ReadableStream } from 'node:stream/web'
import handler from '@/pages/api/proxy-image'

function createResponse() {
  const chunks = []
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader: jest.fn((name, value) => {
      res.headers[name.toLowerCase()] = value
    }),
    status: jest.fn(code => {
      res.statusCode = code
      return res
    }),
    json: jest.fn(payload => {
      res.body = payload
      return res
    }),
    write: jest.fn(chunk => {
      chunks.push(Buffer.from(chunk))
    }),
    end: jest.fn(() => {
      res.body = Buffer.concat(chunks)
      return res
    }),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn()
  }

  return res
}

function createImageResponse() {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: jest.fn(name =>
        name.toLowerCase() === 'content-type' ? 'image/png' : null
      )
    },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]))
        controller.close()
      }
    })
  }
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
            'https://images.unsplash.com/photo.png',
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
          url: 'https://images.unsplash.com/photo.png',
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
          url: 'https://images.unsplash.com/photo.png'
        }
      },
      res
    )

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://images.unsplash.com/photo.png',
      expect.objectContaining({ redirect: 'manual' })
    )
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toMatchObject({ error: 'Domain not allowed' })
  })
})
