jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn()
  }
}))

const {
  promises: { lookup }
} = require('dns')
const handler = require('@/pages/api/webhook-proxy').default

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
    fetch.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content'
    })
  })

  it('rejects non-POST requests', async () => {
    const res = createResponse()

    await handler(createRequest({}, 'GET'), res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects requests without a url', async () => {
    const res = createResponse()

    await handler(createRequest({ payload: { ok: true } }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({ success: false })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects non-http webhook urls', async () => {
    const res = createResponse()

    await handler(createRequest({ url: 'file:///etc/passwd' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({ success: false })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects localhost webhook urls before DNS lookup', async () => {
    const res = createResponse()

    await handler(createRequest({ url: 'https://localhost/webhook' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(lookup).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects bracketed IPv6 local webhook urls before DNS lookup', async () => {
    const res = createResponse()

    await handler(createRequest({ url: 'https://[::1]/webhook' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(lookup).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects webhook hosts that resolve to private IP addresses', async () => {
    lookup.mockResolvedValue([{ address: '10.0.0.12', family: 4 }])
    const res = createResponse()

    await handler(createRequest({ url: 'https://hooks.example.com/webhook' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(fetch).not.toHaveBeenCalled()
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
    expect(fetch).toHaveBeenCalledWith(
      'https://hooks.example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
          'X-Trace-Id': 'trace-1'
        },
        body: JSON.stringify(payload)
      })
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({ success: true, status: 204 })
  })
})
