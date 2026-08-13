jest.mock('@/functions/api/ai-chat', () => ({
  handleAiChatRequest: jest.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ text: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
  ),
  onRequestOptions: jest.fn(
    () =>
      new Response(null, {
        status: 204,
        headers: { 'access-control-allow-origin': 'https://example.com' }
      })
  )
}))
jest.mock('@/lib/ai/siteChatContext', () => ({
  buildSiteChatContext: jest.fn()
}))

import handler from '@/pages/api/ai-chat'
import { handleAiChatRequest, onRequestOptions } from '@/functions/api/ai-chat'
import { buildSiteChatContext } from '@/lib/ai/siteChatContext'

global.Request = class RequestMock {
  constructor(url, init) {
    this.url = url
    Object.assign(this, init)
  }
}

global.Headers = class HeadersMock {
  constructor(init = {}) {
    this.values = new Map(Object.entries(init))
  }
  set(key, value) {
    this.values.set(key.toLowerCase(), value)
  }
  forEach(callback) {
    this.values.forEach((value, key) => callback(value, key))
  }
}

global.Response = class ResponseMock {
  constructor(body, init = {}) {
    this.status = init.status || 200
    this.headers = new Headers(init.headers)
    this.body = body || ''
  }
  async text() {
    return this.body || ''
  }
}

const responseMock = () => {
  const res = {
    headers: {},
    status: jest.fn(() => res),
    send: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
    setHeader: jest.fn((key, value) => {
      res.headers[key] = value
    })
  }
  return res
}

describe('Vercel AI chat route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.AI_CHAT_API_KEY = 'server-key'
    process.env.AI_CHAT_PUBLIC = 'true'
  })

  it('adapts POST requests to the shared handler and context provider', async () => {
    const res = responseMock()
    await handler(
      {
        method: 'POST',
        headers: { host: 'example.com' },
        url: '/api/ai-chat',
        body: { messages: [{ role: 'user', content: 'hi' }] }
      },
      res
    )

    expect(handleAiChatRequest).toHaveBeenCalledTimes(1)
    expect(buildSiteChatContext).toBeDefined()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ text: 'ok' }))
  })

  it('handles CORS preflight through the shared helper', async () => {
    const res = responseMock()
    await handler(
      {
        method: 'OPTIONS',
        headers: { host: 'example.com', origin: 'https://example.com' },
        url: '/api/ai-chat'
      },
      res
    )

    expect(onRequestOptions).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://example.com'
    )
  })

  it('rejects unsupported methods', async () => {
    const res = responseMock()
    await handler({ method: 'GET', headers: {}, url: '/api/ai-chat' }, res)
    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed.' })
  })
})
/**
 * @jest-environment node
 */
