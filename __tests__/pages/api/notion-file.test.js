import { ReadableStream } from 'node:stream/web'
import { Writable } from 'node:stream'

jest.mock('@/lib/db/notion/getNotionAPI', () => ({
  __esModule: true,
  default: {
    getSignedFileUrls: jest.fn()
  }
}))

import notionAPI from '@/lib/db/notion/getNotionAPI'
import handler from '@/pages/api/notion-file'

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

function createFileResponse(body = createSuccessfulBody()) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: jest.fn(name => {
        const normalized = name.toLowerCase()
        if (normalized === 'content-type') return 'application/zip'
        if (normalized === 'content-length') return '3'
        return null
      })
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

describe('/api/notion-file', () => {
  beforeEach(() => {
    notionAPI.getSignedFileUrls.mockResolvedValue({
      signedUrls: [
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/file.zip'
      ]
    })
    global.fetch = jest.fn().mockResolvedValue(createFileResponse())
  })

  it('refreshes a Notion file signed URL and streams it as an attachment', async () => {
    const res = createResponse()

    await handler(
      {
        method: 'GET',
        query: {
          id: 'block-id',
          source: 'attachment:file-id:report.zip',
          filename: 'report.zip'
        }
      },
      res
    )

    expect(notionAPI.getSignedFileUrls).toHaveBeenCalledWith([
      {
        permissionRecord: {
          table: 'block',
          id: 'block-id'
        },
        url: 'attachment:file-id:report.zip'
      }
    ])
    expect(global.fetch).toHaveBeenCalledWith(
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/file.zip',
      expect.objectContaining({ redirect: 'manual' })
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip'
    )
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', '3')
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="report.zip"; filename*=UTF-8\'\'report.zip'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store, max-age=0'
    )
  })

  it('decodes notion.so signed placeholder sources before requesting a fresh URL', async () => {
    const res = createResponse()

    await handler(
      {
        method: 'GET',
        query: {
          id: 'block-id',
          source:
            'https://notion.so/signed/attachment%3Afile-id%3Areport.zip?table=block&id=block-id'
        }
      },
      res
    )

    expect(notionAPI.getSignedFileUrls).toHaveBeenCalledWith([
      expect.objectContaining({
        url: 'attachment:file-id:report.zip'
      })
    ])
  })

  it('rejects refreshed URLs outside the Notion file domains', async () => {
    notionAPI.getSignedFileUrls.mockResolvedValue({
      signedUrls: ['https://evil.example.com/file.zip']
    })
    const res = createResponse()

    await handler(
      {
        method: 'GET',
        query: {
          id: 'block-id',
          source: 'attachment:file-id:report.zip'
        }
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toMatchObject({ error: 'Domain not allowed' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('destroys the response when the upstream file stream fails after sending data', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const streamError = new Error('upstream stream failed')
    global.fetch.mockResolvedValueOnce(
      createFileResponse(createFailingBody(streamError))
    )
    const res = createResponse()
    const destroySpy = jest.spyOn(res, 'destroy')

    await expect(
      handler(
        {
          method: 'GET',
          query: {
            id: 'block-id',
            source: 'attachment:file-id:report.zip'
          }
        },
        res
      )
    ).resolves.toBeUndefined()

    expect(destroySpy).toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('cancels the upstream body after serving a HEAD request', async () => {
    const cancel = jest.fn()
    const body = new ReadableStream({ cancel })
    global.fetch.mockResolvedValueOnce(createFileResponse(body))
    const res = createResponse()

    await handler(
      {
        method: 'HEAD',
        query: {
          id: 'block-id',
          source: 'attachment:file-id:report.zip'
        }
      },
      res
    )

    expect(cancel).toHaveBeenCalledTimes(1)
  })
})
