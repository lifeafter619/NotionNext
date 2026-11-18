import { render } from '@testing-library/react'
import DownloadButton from '@/themes/game/components/DownloadButton'

describe('game DownloadButton', () => {
  it('registers after the window load event has already completed', async () => {
    const register = jest.fn().mockResolvedValue({})
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register }
    })
    jest.spyOn(document, 'readyState', 'get').mockReturnValue('complete')
    const addEventListener = jest.spyOn(window, 'addEventListener')

    render(<DownloadButton />)

    expect(register).toHaveBeenCalledWith('/service-worker.js')
    expect(addEventListener).not.toHaveBeenCalledWith(
      'load',
      expect.any(Function)
    )
  })

  it('removes the deferred install listener when unmounted', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: jest.fn().mockResolvedValue({}) }
    })
    const removeEventListener = jest.spyOn(window, 'removeEventListener')

    const { unmount } = render(<DownloadButton />)
    unmount()

    expect(removeEventListener).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function)
    )
  })
})
