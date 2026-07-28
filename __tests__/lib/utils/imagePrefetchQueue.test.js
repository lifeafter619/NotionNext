import {
  enqueueImagePrefetch,
  __imagePrefetchQueueTestHooks as hooks
} from '@/lib/utils/imagePrefetchQueue'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) =>
    key === 'IMAGE_PREFETCH_ENABLE' ? imagePrefetchEnabled : fallback
  )
}))

let imagePrefetchEnabled

describe('imagePrefetchQueue', () => {
  const OriginalImage = global.Image
  let createdImages

  beforeEach(() => {
    hooks.reset()
    imagePrefetchEnabled = true
    createdImages = []
    global.Image = class MockImage {
      constructor() {
        createdImages.push(this)
      }
    }
  })

  afterEach(() => {
    global.Image = OriginalImage
    if ('connection' in navigator) {
      delete navigator.connection
    }
  })

  it('queues images without fetching until the queue starts', () => {
    enqueueImagePrefetch({ src: 'https://example.com/a.jpg' })
    enqueueImagePrefetch({ src: 'https://example.com/b.jpg' })

    expect(createdImages).toHaveLength(0)
    expect(hooks.state().pending).toBe(2)
  })

  it('limits concurrent prefetches and continues as images finish', () => {
    for (let i = 0; i < 6; i++) {
      enqueueImagePrefetch({ src: `https://example.com/${i}.jpg` })
    }

    hooks.start()

    expect(createdImages).toHaveLength(4)
    expect(hooks.state().inFlight).toBe(4)
    expect(hooks.state().pending).toBe(2)

    createdImages[0].onload()

    expect(createdImages).toHaveLength(5)
    expect(hooks.state().inFlight).toBe(4)

    createdImages[1].onerror()
    createdImages[2].onload()

    expect(createdImages).toHaveLength(6)
  })

  it('deduplicates identical urls', () => {
    enqueueImagePrefetch({ src: 'https://example.com/same.jpg' })
    enqueueImagePrefetch({ src: 'https://example.com/same.jpg' })

    expect(hooks.state().pending).toBe(1)
  })

  it('skips cancelled entries when draining', () => {
    const cancel = enqueueImagePrefetch({
      src: 'https://example.com/cancelled.jpg'
    })
    enqueueImagePrefetch({ src: 'https://example.com/kept.jpg' })

    cancel()
    hooks.start()

    expect(createdImages).toHaveLength(1)
    expect(createdImages[0].src).toBe('https://example.com/kept.jpg')
  })

  it('ignores data urls and empty sources', () => {
    enqueueImagePrefetch({ src: 'data:image/gif;base64,AAAA' })
    enqueueImagePrefetch({ src: '' })
    enqueueImagePrefetch(null)

    expect(hooks.state().pending).toBe(0)
  })

  it('does not prefetch when the user enables data saver', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true }
    })

    enqueueImagePrefetch({ src: 'https://example.com/saver.jpg' })

    expect(hooks.state().pending).toBe(0)
  })

  it('does not prefetch when the feature is disabled', () => {
    imagePrefetchEnabled = false

    enqueueImagePrefetch({ src: 'https://example.com/disabled.jpg' })

    expect(hooks.state().pending).toBe(0)
  })

  it('does not prefetch on 2g connections', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: false, effectiveType: 'slow-2g' }
    })

    enqueueImagePrefetch({ src: 'https://example.com/slow.jpg' })

    expect(hooks.state().pending).toBe(0)
  })

  it('does not prefetch on 3g connections', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: false, effectiveType: '3g' }
    })

    enqueueImagePrefetch({ src: 'https://example.com/slow.jpg' })

    expect(hooks.state().pending).toBe(0)
  })

  it('warms images with low priority, no referrer and the exact srcset/sizes', () => {
    enqueueImagePrefetch({
      src: 'https://example.com/pic.jpg?width=1080',
      srcSet:
        'https://example.com/pic.jpg?width=320 320w, https://example.com/pic.jpg?width=1080 1080w',
      sizes: '(min-width: 720px) 42vw, 100vw'
    })

    hooks.start()

    const image = createdImages[0]
    expect(image.fetchPriority).toBe('low')
    expect(image.referrerPolicy).toBe('no-referrer')
    expect(image.decoding).toBe('async')
    expect(image.sizes).toBe('(min-width: 720px) 42vw, 100vw')
    expect(image.srcset).toContain('320w')
    expect(image.src).toBe('https://example.com/pic.jpg?width=1080')
  })

  it('allows re-queueing a url after its entry was cancelled', () => {
    const cancel = enqueueImagePrefetch({ src: 'https://example.com/re.jpg' })
    cancel()

    enqueueImagePrefetch({ src: 'https://example.com/re.jpg' })

    expect(hooks.state().pending).toBe(1)
  })
})
