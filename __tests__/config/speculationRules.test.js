const fs = require('node:fs')
const path = require('node:path')

const nextConfig = require('../../next.config')
const vercelConfig = require('../../vercel.json')

const SPECULATION_RULES_HEADER = '"/speculation-rules.json"'
const SPECULATION_RULES_CONTENT_TYPE = 'application/speculationrules+json'
const SPECULATION_RULES_CACHE_CONTROL =
  'public, max-age=86400, stale-while-revalidate=604800'

function findHeader(headers, key) {
  return headers.find(header => header.key === key)?.value
}

describe('Cloudflare speculative loading guard', () => {
  it('serves an empty speculation rules document', () => {
    const rulesPath = path.join(
      process.cwd(),
      'public',
      'speculation-rules.json'
    )
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'))

    expect(rules).toEqual({ prefetch: [] })
  })

  it('declares the origin rules in Next.js responses', async () => {
    const route = (await nextConfig.headers()).find(
      entry => entry.source === '/:path*{/}?'
    )

    expect(findHeader(route.headers, 'Speculation-Rules')).toBe(
      SPECULATION_RULES_HEADER
    )
  })

  it('declares the same origin rules in Vercel responses', () => {
    const route = vercelConfig.headers.find(entry => entry.source === '/(.*)')

    expect(findHeader(route.headers, 'Speculation-Rules')).toBe(
      SPECULATION_RULES_HEADER
    )
  })

  it('serves external rules with the MIME type required by Chromium', async () => {
    const nextRoute = (await nextConfig.headers()).find(
      entry => entry.source === '/speculation-rules.json'
    )
    const vercelRoute = vercelConfig.headers.find(
      entry => entry.source === '/speculation-rules.json'
    )

    for (const route of [nextRoute, vercelRoute]) {
      expect(findHeader(route.headers, 'Content-Type')).toBe(
        SPECULATION_RULES_CONTENT_TYPE
      )
      expect(findHeader(route.headers, 'Cache-Control')).toBe(
        SPECULATION_RULES_CACHE_CONTROL
      )
    }
  })
})
