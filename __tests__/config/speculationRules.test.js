const fs = require('node:fs')
const path = require('node:path')

const nextConfig = require('../../next.config')
const vercelConfig = require('../../vercel.json')

const SPECULATION_RULES_HEADER = '"/speculation-rules.json"'

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
})
