const mockLoadExternalResource = jest.fn()

jest.mock('@/lib/utils', () => ({
  loadExternalResource: (...args) => mockLoadExternalResource(...args)
}))

describe('loadWowJS', () => {
  const originalMatchMedia = window.matchMedia
  const originalUserAgent = window.navigator.userAgent
  let initMock

  beforeEach(() => {
    jest.resetModules()
    mockLoadExternalResource.mockReset()
    mockLoadExternalResource.mockResolvedValue('loaded')
    document.body.innerHTML = '<div class="wow">Animated</div>'
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 desktop'
    })
    window.matchMedia = jest.fn(() => ({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
    initMock = jest.fn()
    window.WOW = function WOW() {
      return {
        init: initMock
      }
    }
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent
    })
    delete window.WOW
  })

  it('does not load animation assets for users who prefer reduced motion', async () => {
    window.matchMedia = jest.fn(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))

    const { loadWowJS } = await import('@/lib/plugins/wow')

    await loadWowJS()

    expect(mockLoadExternalResource).not.toHaveBeenCalled()
  })

  it('does not load animation assets on mobile devices', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 iPhone'
    })

    const { loadWowJS } = await import('@/lib/plugins/wow')

    await loadWowJS()

    expect(mockLoadExternalResource).not.toHaveBeenCalled()
  })

  it('does not load animation assets when no wow elements exist', async () => {
    document.body.innerHTML = '<main>No scroll animation</main>'

    const { loadWowJS } = await import('@/lib/plugins/wow')

    await loadWowJS()

    expect(mockLoadExternalResource).not.toHaveBeenCalled()
  })

  it('loads and initializes animation assets on desktop pages with wow elements', async () => {
    const { loadWowJS } = await import('@/lib/plugins/wow')

    await loadWowJS()

    expect(mockLoadExternalResource).toHaveBeenCalledWith(
      '/css/wow/animate.css',
      'css'
    )
    expect(mockLoadExternalResource).toHaveBeenCalledWith(
      'https://cdnjs.cloudflare.com/ajax/libs/wow/1.1.2/wow.min.js',
      'js'
    )
    expect(initMock).toHaveBeenCalledTimes(1)
  })
})
