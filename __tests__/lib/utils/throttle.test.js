import throttle from '@/lib/utils/throttle'

describe('throttle utility', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('cancels a pending trailing invocation', () => {
    const fn = jest.fn()
    const throttled = throttle(fn, 100)

    throttled('first')
    throttled('second')
    throttled.cancel()
    jest.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')
  })
})
