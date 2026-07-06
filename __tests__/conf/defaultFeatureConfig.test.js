describe('default feature config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_ANALYTICS_BUSUANZI_ENABLE
    delete process.env.NEXT_PUBLIC_FONT_URL
    delete process.env.NEXT_PUBLIC_FONT_URLS
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('keeps busuanzi analytics enabled by default', () => {
    const analyticsConfig = require('@/conf/analytics.config')

    expect(analyticsConfig.ANALYTICS_BUSUANZI_ENABLE).toBe(true)
  })

  it('keeps the default Chinese web font stylesheet', () => {
    const fontConfig = require('@/conf/font.config')

    expect(fontConfig.FONT_URL).toContain(
      'https://npm.elemecdn.com/lxgw-wenkai-webfont@1.7.0/style.css'
    )
  })
})
