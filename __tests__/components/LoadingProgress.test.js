import { act, render } from '@testing-library/react'
import LoadingProgress from '@/components/LoadingProgress'
import { loadExternalResource } from '@/lib/utils'

const routeHandlers = {}
const events = {
  on: jest.fn((event, handler) => {
    routeHandlers[event] = handler
  }),
  off: jest.fn()
}
const router = { events }

jest.mock('@/lib/utils', () => ({
  loadExternalResource: jest.fn()
}))

jest.mock('next/router', () => ({
  useRouter: () => router
}))

function deferred() {
  let resolve
  const promise = new Promise(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

async function resolveResource(resource) {
  await act(async () => {
    resource.resolve()
    await resource.promise
  })
}

describe('LoadingProgress', () => {
  beforeEach(() => {
    delete window.NProgress
    Object.keys(routeHandlers).forEach(event => delete routeHandlers[event])
  })

  afterEach(() => {
    delete window.NProgress
  })

  it('uses the NProgress instance that becomes available after route handlers register', async () => {
    const scriptResource = deferred()
    const nProgress = {
      start: jest.fn(),
      done: jest.fn(),
      settings: {}
    }
    loadExternalResource
      .mockReturnValueOnce(scriptResource.promise)
      .mockResolvedValueOnce()

    render(<LoadingProgress />)

    expect(routeHandlers.routeChangeStart).toEqual(expect.any(Function))
    expect(routeHandlers.routeChangeComplete).toEqual(expect.any(Function))
    expect(routeHandlers.routeChangeError).toEqual(expect.any(Function))

    window.NProgress = nProgress
    await resolveResource(scriptResource)

    act(() => {
      routeHandlers.routeChangeStart('/post')
      routeHandlers.routeChangeComplete('/post')
      routeHandlers.routeChangeError(new Error('cancelled'), '/post')
    })

    expect(nProgress.start).toHaveBeenCalledTimes(1)
    expect(nProgress.done).toHaveBeenCalledTimes(2)
  })

  it('sets the minimum setting and requests CSS only after the script is available', async () => {
    const scriptResource = deferred()
    const nProgress = {
      start: jest.fn(),
      done: jest.fn(),
      settings: {}
    }
    loadExternalResource
      .mockReturnValueOnce(scriptResource.promise)
      .mockResolvedValueOnce()

    const { container } = render(<LoadingProgress />)

    expect(container).toBeEmptyDOMElement()
    expect(loadExternalResource).toHaveBeenCalledTimes(1)
    expect(loadExternalResource).toHaveBeenNthCalledWith(
      1,
      'https://cdnjs.snrat.com/ajax/libs/nprogress/0.2.0/nprogress.min.js',
      'js'
    )

    window.NProgress = nProgress
    await resolveResource(scriptResource)

    expect(nProgress.settings.minimum).toBe(0.1)
    expect(loadExternalResource).toHaveBeenNthCalledWith(
      2,
      'https://cdnjs.snrat.com/ajax/libs/nprogress/0.2.0/nprogress.min.css',
      'css'
    )
  })

  it('unregisters the exact route handler functions registered on mount', () => {
    loadExternalResource.mockReturnValueOnce(new Promise(() => {}))

    const { unmount } = render(<LoadingProgress />)
    const registeredHandlers = { ...routeHandlers }

    unmount()

    expect(events.off).toHaveBeenCalledWith(
      'routeChangeStart',
      registeredHandlers.routeChangeStart
    )
    expect(events.off).toHaveBeenCalledWith(
      'routeChangeComplete',
      registeredHandlers.routeChangeComplete
    )
    expect(events.off).toHaveBeenCalledWith(
      'routeChangeError',
      registeredHandlers.routeChangeError
    )
  })

  it('ignores a script resource that resolves after unmount', async () => {
    const scriptResource = deferred()
    const nProgress = {
      start: jest.fn(),
      done: jest.fn(),
      settings: {}
    }
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    loadExternalResource.mockReturnValueOnce(scriptResource.promise)

    const { unmount } = render(<LoadingProgress />)
    const registeredHandlers = { ...routeHandlers }
    unmount()

    window.NProgress = nProgress
    await resolveResource(scriptResource)

    act(() => {
      registeredHandlers.routeChangeStart('/post')
      registeredHandlers.routeChangeComplete('/post')
      registeredHandlers.routeChangeError(new Error('cancelled'), '/post')
    })

    expect(loadExternalResource).toHaveBeenCalledTimes(1)
    expect(nProgress.settings.minimum).toBeUndefined()
    expect(nProgress.start).not.toHaveBeenCalled()
    expect(nProgress.done).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
