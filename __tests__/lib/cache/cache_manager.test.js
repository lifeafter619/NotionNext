/**
 * @jest-environment node
 */

const originalLifecycleEvent = process.env.npm_lifecycle_event

async function loadBuildCacheManager() {
  const existingExitListeners = new Set(process.listeners('exit'))
  const emptyCache = {
    getCache: jest.fn(async () => null),
    setCache: jest.fn(async () => {}),
    delCache: jest.fn(async () => {})
  }

  jest.resetModules()
  jest.doMock('@/blog.config', () => ({
    __esModule: true,
    default: {
      ENABLE_CACHE: true,
      REDIS_URL: '',
      isProd: true
    }
  }))
  jest.doMock('@/lib/cache/local_file_cache', () => ({
    __esModule: true,
    default: emptyCache
  }))
  jest.doMock('@/lib/cache/memory_cache', () => ({
    __esModule: true,
    default: emptyCache
  }))
  jest.doMock('@/lib/cache/redis_cache', () => ({
    __esModule: true,
    default: emptyCache
  }))
  jest.doMock('@/lib/cache/file_lock', () => ({
    withFileLock: jest.fn(async (_key, fn) => fn())
  }))

  const cacheManager = await import('@/lib/cache/cache_manager')
  const cleanup = () => {
    process
      .listeners('exit')
      .filter(listener => !existingExitListeners.has(listener))
      .forEach(listener => process.off('exit', listener))
  }
  return { ...cacheManager, cleanup }
}

describe('cache manager build failures', () => {
  beforeEach(() => {
    process.env.npm_lifecycle_event = 'build'
  })

  afterEach(() => {
    if (originalLifecycleEvent === undefined) {
      delete process.env.npm_lifecycle_event
    } else {
      process.env.npm_lifecycle_event = originalLifecycleEvent
    }
  })

  it('does not create an unhandled rejection while clearing an inflight load', async () => {
    const { getOrSetDataWithCache, cleanup } = await loadBuildCacheManager()
    const unhandled = jest.fn()
    process.on('unhandledRejection', unhandled)

    try {
      await expect(
        getOrSetDataWithCache('failed-build-key', async () => {
          throw new Error('loader failed')
        })
      ).rejects.toThrow('loader failed')
      await new Promise(resolve => setImmediate(resolve))

      expect(unhandled).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
      cleanup()
    }
  })
})
