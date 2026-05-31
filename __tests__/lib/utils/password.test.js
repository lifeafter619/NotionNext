import { getPasswordQuery, rememberPasswordForPath } from '@/lib/utils/password'

describe('password storage helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the password from the URL when localStorage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(getPasswordQuery('/locked-post?password=secret')).toEqual(['secret'])
  })

  it('does not throw when remembering an unlocked article password fails', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(() =>
      rememberPasswordForPath('/locked-post', 'secret')
    ).not.toThrow()
  })
})
