import {
  initDarkMode,
  loadDarkModeFromLocalStorage,
  saveDarkModeToLocalStorage
} from '@/themes/theme'

describe('theme dark mode storage', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    document.documentElement.className = ''
  })

  it('falls back when localStorage reads fail during dark mode initialization', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    const updateDarkMode = jest.fn()

    expect(() => initDarkMode(updateDarkMode, 'false')).not.toThrow()
    expect(updateDarkMode).toHaveBeenCalledWith(false)
  })

  it('does not throw when saving dark mode fails', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(() => saveDarkModeToLocalStorage(true)).not.toThrow()
  })

  it('returns null when reading dark mode fails', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(loadDarkModeFromLocalStorage()).toBeNull()
  })
})
