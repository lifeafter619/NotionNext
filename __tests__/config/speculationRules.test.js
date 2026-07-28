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

describe('Speculative loading rules', () => {
  it('prefetches article navigation on hover (moderate eagerness)', () => {
    // 文章链接在鼠标悬停时由浏览器 Speculation Rules API 预取，
    // 点击时近乎秒开。eagerness=moderate 不在 load 后立即预取所有链接，
    // 避免首页几十篇文章一次性预取浪费带宽。
    const rulesPath = path.join(
      process.cwd(),
      'public',
      'speculation-rules.json'
    )
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'))

    expect(rules).toEqual({
      prefetch: [
        {
          source: 'document',
          where: {
            and: [
              { href_matches: ['/*article/*', '/*/article/*'] },
              { not: { href_matches: '/article' } }
            ]
          },
          eagerness: 'moderate'
        }
      ]
    })
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
