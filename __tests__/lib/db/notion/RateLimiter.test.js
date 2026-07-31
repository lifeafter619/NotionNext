/**
 * @jest-environment node
 */

import { RateLimiter } from '@/lib/db/notion/RateLimiter'

describe('Notion RateLimiter', () => {
  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('paces the next request after a rejected request', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-07-31T00:00:00Z'))

    const limiter = new RateLimiter(200, undefined, 100)
    const starts = []
    const first = limiter.enqueue('first', async () => {
      starts.push(Date.now())
      throw new Error('429 Too Many Requests')
    })
    const second = limiter.enqueue('second', async () => {
      starts.push(Date.now())
      return 'ok'
    })
    const firstResult = expect(first).rejects.toThrow('429 Too Many Requests')

    await jest.advanceTimersByTimeAsync(0)
    await firstResult
    expect(starts).toHaveLength(1)

    await jest.advanceTimersByTimeAsync(99)
    expect(starts).toHaveLength(1)

    await jest.advanceTimersByTimeAsync(1)
    await expect(second).resolves.toBe('ok')
  })
})
