import handler from '@/pages/api/visitor-location'

function createResponse() {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn(code => {
      res.statusCode = code
      return res
    }),
    json: jest.fn(body => {
      res.body = body
      return res
    })
  }
  return res
}

function createRequest(overrides = {}) {
  return {
    method: 'GET',
    headers: { 'x-forwarded-for': '203.0.113.8' },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides
  }
}

describe('/api/visitor-location', () => {
  const originalAk = process.env.BAIDU_MAP_AK

  beforeEach(() => {
    process.env.BAIDU_MAP_AK = 'server-only-test-ak'
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 0,
        content: { address_detail: { city: '上海市' } }
      })
    })
  })

  afterAll(() => {
    if (originalAk === undefined) delete process.env.BAIDU_MAP_AK
    else process.env.BAIDU_MAP_AK = originalAk
  })

  it('accepts only GET requests', async () => {
    const res = createResponse()
    await handler(createRequest({ method: 'POST' }), res)

    expect(res.statusCode).toBe(405)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requires a server-side Baidu AK', async () => {
    delete process.env.BAIDU_MAP_AK
    const res = createResponse()
    await handler(createRequest(), res)

    expect(res.statusCode).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends the validated visitor IP to Baidu and returns only the city', async () => {
    const res = createResponse()
    await handler(
      createRequest({
        headers: {
          'cf-connecting-ip': '198.51.100.9',
          'x-forwarded-for': '203.0.113.8'
        }
      }),
      res
    )

    const requestUrl = new URL(String(fetch.mock.calls[0][0]))
    expect(requestUrl.origin + requestUrl.pathname).toBe(
      'https://api.map.baidu.com/location/ip'
    )
    expect(requestUrl.searchParams.get('ak')).toBe('server-only-test-ak')
    expect(requestUrl.searchParams.get('ip')).toBe('198.51.100.9')
    expect(requestUrl.searchParams.get('coor')).toBe('bd09ll')
    expect(res.body).toEqual({ city: '上海市' })
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store, max-age=0'
    )
  })

  it('rejects invalid forwarded IP values', async () => {
    const res = createResponse()
    await handler(
      createRequest({ headers: { 'x-forwarded-for': 'not-an-ip' } }),
      res
    )

    expect(res.statusCode).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not expose Baidu error responses', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 302, message: 'quota exceeded' })
    })
    const res = createResponse()
    await handler(createRequest(), res)

    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({ error: 'Location lookup failed' })
  })

  it('falls back to the country for visitors without city data', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 0,
        content: { address_detail: { nation: 'United States' } }
      })
    })
    const res = createResponse()
    await handler(createRequest(), res)

    expect(res.body).toEqual({ city: 'United States' })
  })

  it('times out a stalled Baidu request', async () => {
    jest.useFakeTimers()
    fetch.mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    })
    const res = createResponse()
    const request = handler(createRequest(), res)

    await jest.advanceTimersByTimeAsync(4000)
    await request

    expect(res.statusCode).toBe(504)
    jest.useRealTimers()
  })
})
