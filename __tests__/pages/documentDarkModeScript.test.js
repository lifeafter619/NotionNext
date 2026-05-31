import { darkModeScript } from '@/pages/_document'

describe('document dark mode bootstrap script', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    document.documentElement.className = ''
  })

  it('applies a theme class even when localStorage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(() => {
      // eslint-disable-next-line no-eval
      eval(darkModeScript)
    }).not.toThrow()
    expect(document.documentElement.classList.length).toBeGreaterThan(0)
  })
})
