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

  it('loads LXGW WenKai by default as the opt-in web font', () => {
    const fontConfig = require('@/conf/font.config')

    expect(fontConfig.FONT_URL).toEqual([
      'https://npm.elemecdn.com/lxgw-wenkai-webfont@1.7.0/style.css'
    ])
  })

  it('allows an explicit web font stylesheet opt-in', () => {
    process.env.NEXT_PUBLIC_FONT_URL = 'https://example.com/font.css'
    jest.resetModules()

    const fontConfig = require('@/conf/font.config')

    expect(fontConfig.FONT_URL).toEqual(['https://example.com/font.css'])
  })
})
