jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn()
  }
}))

jest.mock('http', () => ({
  request: jest.fn()
}))

jest.mock('https', () => ({
  request: jest.fn()
}))

const {
  promises: { lookup }
} = require('dns')
const { EventEmitter } = require('events')
const { request: httpRequest } = require('http')
const { request: httpsRequest } = require('https')
const handler = require('@/pages/api/webhook-proxy').default

let lastRequest

function mockHttpsResponse({
  statusCode = 204,
  statusMessage = 'No Content'
} = {}) {
  httpsRequest.mockImplementation((options, callback) => {
    const handlers = {}
    const upstreamResponse = new EventEmitter()
    upstreamResponse.statusCode = statusCode
    upstreamResponse.statusMessage = statusMessage
    upstreamResponse.resume = jest.fn()

    lastRequest = {
      on: jest.fn((event, handler) => {
        handlers[event] = handler
        return lastRequest
      }),
      write: jest.fn(),
      end: jest.fn(() => {
        callback(upstreamResponse)
        upstreamResponse.emit('end')
      }),
      destroy: jest.fn(error => {
        handlers.error?.(error)
      })
    }

    return lastRequest
  })
}

function createResponse() {
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
    })
  }

  return res
}

function createRequest(body, method = 'POST') {
  return {
    method,
    body
  }
}

describe('/api/webhook-proxy', () => {
  beforeEach(() => {
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    httpRequest.mockReset()
    httpsRequest.mockReset()
    lastRequest = null
    mockHttpsResponse()
  })

  it('rejects non-POST requests', async () => {
    const res = createResponse()

    await handler(createRequest({}, 'GET'), res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST')
    expect(httpsRequest).not.toHaveBeenCalled()
  })

  it('rejects requests without a url', async () => {
    const res = createResponse()

    await handler(createRequest({ payload: { ok: true } }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({ success: false })
    expect(httpsRequest).not.toHaveBeenCalled()
  })

  it('rejects non-http webhook urls', async () => {
    const res = createResponse()

    await handler(createRequest({ url: 'file:///etc/passwd' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({ success: false })
    expect(httpsRequest).not.toHaveBeenCalled()
  })

  it('rejects localhost webhook urls before DNS lookup', async () => {
    const res = createResponse()

    await handler(createRequest({ url: 'https://localhost/webhook' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(lookup).not.toHaveBeenCalled()
    expect(httpsRequest).not.toHaveBeenCalled()
  })

  it('rejects bracketed IPv6 local webhook urls before DNS lookup', async () => {
    const res = createResponse()

    await handler(createRequest({ url: 'https://[::1]/webhook' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(lookup).not.toHaveBeenCalled()
    expect(httpsRequest).not.toHaveBeenCalled()
  })

  it('rejects webhook hosts that resolve to private IP addresses', async () => {
    lookup.mockResolvedValue([{ address: '10.0.0.12', family: 4 }])
    const res = createResponse()

    await handler(createRequest({ url: 'https://hooks.example.com/webhook' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(httpsRequest).not.toHaveBeenCalled()
  })

  it('forwards valid webhook payloads with sanitized custom headers', async () => {
    const res = createResponse()
    const payload = { event: 'clicked' }

    await handler(
      createRequest({
        url: 'https://hooks.example.com/webhook',
        payload,
        headers: {
          Authorization: 'Bearer token',
          'X-Trace-Id': 'trace-1',
          Host: 'internal.service',
          'Content-Length': '999'
        }
      }),
      res
    )

    expect(lookup).toHaveBeenCalledWith('hooks.example.com', {
      all: true,
      verbatim: true
    })
    expect(httpsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: 'https:',
        hostname: '93.184.216.34',
        port: 443,
        method: 'POST',
        path: '/webhook',
        servername: 'hooks.example.com',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
          'X-Trace-Id': 'trace-1',
          Host: 'hooks.example.com',
          'Content-Length': Buffer.byteLength(JSON.stringify(payload))
        },
        timeout: 10000
      }),
      expect.any(Function)
    )
    expect(lastRequest.write).toHaveBeenCalledWith(JSON.stringify(payload))
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({ success: true, status: 204 })
  })
})
