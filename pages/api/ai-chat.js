import { handleAiChatRequest, onRequestOptions } from '@/functions/api/ai-chat'
import { buildSiteChatContext } from '@/lib/ai/siteChatContext'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20kb'
    }
  },
  maxDuration: 40
}

function getRequestUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers.host || 'localhost'
  return `${protocol}://${host}${req.url || '/api/ai-chat'}`
}

function copyHeaders(headers) {
  const result = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      result.set(key, value.join(', '))
    } else if (value !== undefined) {
      result.set(key, String(value))
    }
  })
  return result
}

async function sendWebResponse(response, res) {
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.status(response.status)
  res.send(await response.text())
}

export default async function handler(req, res) {
  if (!['POST', 'OPTIONS'].includes(req.method || '')) {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const request = new Request(getRequestUrl(req), {
    method: req.method,
    headers: copyHeaders(req.headers),
    body: req.method === 'POST' ? JSON.stringify(req.body ?? {}) : undefined
  })

  if (req.method === 'OPTIONS') {
    const response = onRequestOptions({
      request,
      env: process.env,
      next: async nextResponse => nextResponse
    })
    return sendWebResponse(response, res)
  }

  const response = await handleAiChatRequest(request, process.env, {
    getSiteContext: buildSiteChatContext
  })
  return sendWebResponse(response, res)
}
