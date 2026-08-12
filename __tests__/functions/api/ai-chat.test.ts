/**
 * @jest-environment node
 *
 * Unit tests for the hardened AI chat proxy (functions/api/ai-chat.ts).
 *
 * Every rejection scenario asserts that global.fetch was NOT called, so the
 * paid upstream model is never invoked for invalid or abusive requests.
 * The success path asserts a controlled JSON response.
 */

jest.useFakeTimers()

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('ai-chat proxy', () => {
  let aiChat: typeof import('@/functions/api/ai-chat')

  const baseEnv = {
    AI_CHAT_API_KEY: 'test-key',
    AI_CHAT_PUBLIC: 'true'
  }

  const buildRequest = (body: unknown, init: RequestInit = {}) =>
    new Request('https://example.com/api/ai-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...init
    })

  const runPost = async (
    body: unknown,
    env: Record<string, string> = {},
    init: RequestInit = {}
  ) => {
    const fullEnv = { ...baseEnv, ...env }
    const request = buildRequest(body, init)
    const response = await aiChat.onRequestPost({
      request,
      env: fullEnv,
      next: async (res: Response) => res
    })
    return response
  }

  beforeEach(() => {
    jest.resetModules()
    mockFetch.mockReset()
    aiChat = require('@/functions/api/ai-chat')
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('rejection paths (model never called)', () => {
    it('rejects malformed JSON with 400', async () => {
      const res = await runPost('{not valid json')
      expect(res.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects JSON null with 400', async () => {
      const res = await runPost('null')
      expect(res.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects non-object body (array) with 400', async () => {
      const res = await runPost([1, 2, 3])
      expect(res.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects empty body with 400', async () => {
      const res = await runPost('')
      expect(res.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects oversized body without Content-Length', async () => {
      const longContent = 'a'.repeat(21_000)
      const res = await runPost(
        { messages: [{ role: 'user', content: longContent }] },
        {},
        { headers: {} } // no content-length
      )
      expect(res.status).toBe(413)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects empty messages array with 400', async () => {
      const res = await runPost({ messages: [] })
      expect(res.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects empty user question with 400', async () => {
      const res = await runPost({
        messages: [{ role: 'user', content: '   ' }]
      })
      expect(res.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects disallowed role with 400', async () => {
      const res = await runPost({
        messages: [{ role: 'tool', content: 'hello' }]
      })
      expect(res.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects empty content with 400', async () => {
      const res = await runPost({
        messages: [{ role: 'user', content: '' }]
      })
      expect(res.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects too many messages with 400', async () => {
      const messages = Array.from({ length: 13 }, (_, i) => ({
        role: 'user',
        content: `msg ${i}`
      }))
      const res = await runPost({ messages })
      expect(res.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects disallowed Origin with 403', async () => {
      const res = await runPost(
        { messages: [{ role: 'user', content: 'hi' }] },
        { AI_CHAT_CORS_ORIGINS: 'https://allowed.example.com' },
        { headers: { origin: 'https://evil.example.com' } }
      )
      expect(res.status).toBe(403)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects when API key is missing with 500', async () => {
      const res = await runPost(
        { messages: [{ role: 'user', content: 'hi' }] },
        { AI_CHAT_API_KEY: '', AI_CHAT_PUBLIC: 'true' }
      )
      expect(res.status).toBe(500)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects when public proxy is disabled with 403', async () => {
      const res = await runPost(
        { messages: [{ role: 'user', content: 'hi' }] },
        { AI_CHAT_PUBLIC: 'false' }
      )
      expect(res.status).toBe(403)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('temperature validation', () => {
    it('falls back to default when temperature < 0', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      await runPost(
        { messages: [{ role: 'user', content: 'hi' }] },
        { AI_CHAT_TEMPERATURE: '-5' }
      )
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.temperature).toBe(0.3)
    })

    it('falls back to default when temperature > 2', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      await runPost(
        { messages: [{ role: 'user', content: 'hi' }] },
        { AI_CHAT_TEMPERATURE: '5' }
      )
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.temperature).toBe(0.3)
    })

    it('falls back to default when temperature is non-numeric', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      await runPost(
        { messages: [{ role: 'user', content: 'hi' }] },
        { AI_CHAT_TEMPERATURE: 'hot' }
      )
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.temperature).toBe(0.3)
    })
  })

  describe('upstream error handling', () => {
    it('returns 504 on timeout (AbortError)', async () => {
      mockFetch.mockImplementationOnce(() =>
        new Promise((_, reject) => {
          const err = new Error('The operation was aborted')
          err.name = 'AbortError'
          reject(err)
        })
      )
      const res = await runPost({
        messages: [{ role: 'user', content: 'hi' }]
      })
      expect(res.status).toBe(504)
      const data = await res.json()
      expect(data.error).toMatch(/timed out/i)
    })

    it('returns 502 on non-JSON response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('<html>error</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        })
      )
      const res = await runPost({
        messages: [{ role: 'user', content: 'hi' }]
      })
      expect(res.status).toBe(502)
    })

    it('returns 502 on network error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const res = await runPost({
        messages: [{ role: 'user', content: 'hi' }]
      })
      expect(res.status).toBe(502)
      const data = await res.json()
      expect(data.error).not.toMatch(/test-key/) // API key not leaked
    })
  })

  describe('success path', () => {
    it('returns controlled JSON on a valid request', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Hello!' } }]
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      const res = await runPost({
        messages: [{ role: 'user', content: 'hi' }]
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.text).toBe('Hello!')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Assert the model request carries the API key and stream:false.
      const callArgs = mockFetch.mock.calls[0]
      const callHeaders = callArgs[1].headers
      expect(callHeaders.authorization).toBe('Bearer test-key')
      const callBody = JSON.parse(callArgs[1].body)
      expect(callBody.stream).toBe(false)
    })
  })

  describe('rate limiting', () => {
    it('rejects with 429 after exceeding the window quota', async () => {
      // Configure a tiny window for the test.
      const env = { AI_CHAT_RATE_LIMIT: '2,60,100' }
      const okResponse = () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      // Each call needs a fresh Response (bodies are single-use streams).
      mockFetch.mockImplementation(() => Promise.resolve(okResponse()))

      const r1 = await runPost({ messages: [{ role: 'user', content: 'a' }] }, env)
      const r2 = await runPost({ messages: [{ role: 'user', content: 'b' }] }, env)
      const r3 = await runPost({ messages: [{ role: 'user', content: 'c' }] }, env)

      expect(r1.status).toBe(200)
      expect(r2.status).toBe(200)
      expect(r3.status).toBe(429)
      // Only the two allowed requests called the model.
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
