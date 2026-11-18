import {
  APPEARANCE_MODE,
  initDarkMode,
  loadDarkModeFromLocalStorage,
  saveDarkModeToLocalStorage,
  subscribeToSystemAppearance
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

  it('uses system appearance by default and exposes the selected mode', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    window.matchMedia.mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })
    const updateDarkMode = jest.fn()
    const updateAppearanceMode = jest.fn()

    initDarkMode(updateDarkMode, 'system', updateAppearanceMode)

    expect(updateAppearanceMode).toHaveBeenCalledWith(APPEARANCE_MODE.SYSTEM)
    expect(updateDarkMode).toHaveBeenCalledWith(true)
    expect(document.documentElement).toHaveClass('dark')
  })

  it('stores explicit appearance mode names while accepting legacy booleans', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem')
    saveDarkModeToLocalStorage(true)
    expect(setItem).toHaveBeenLastCalledWith('darkMode', 'dark')

    saveDarkModeToLocalStorage(APPEARANCE_MODE.SYSTEM)
    expect(setItem).toHaveBeenLastCalledWith('darkMode', 'system')
  })

  it('updates system mode whenever the operating-system preference changes', () => {
    let changeHandler
    const removeEventListener = jest.fn()
    window.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: jest.fn((event, handler) => {
        if (event === 'change') changeHandler = handler
      }),
      removeEventListener
    })
    const updateDarkMode = jest.fn()

    const unsubscribe = subscribeToSystemAppearance(updateDarkMode)
    changeHandler({ matches: true })

    expect(updateDarkMode).toHaveBeenCalledWith(true)
    expect(document.documentElement).toHaveClass('dark')
    unsubscribe()
    expect(removeEventListener).toHaveBeenCalledWith('change', changeHandler)
  })
})
