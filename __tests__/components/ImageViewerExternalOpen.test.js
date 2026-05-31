import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ImageViewer from '@/components/ImageViewer'

describe('ImageViewer external open fallback', () => {
  beforeEach(() => {
    window.open = jest.fn()
  })

  it('uses noopener and noreferrer when falling back to opening an image', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const { unmount } = render(
      <ImageViewer
        isOpen={true}
        images={[{ src: 'https://cdn.example.com/image.png', alt: 'Example' }]}
        currentIndex={0}
        onClose={jest.fn()}
      />
    )

    jest.spyOn(document.body, 'appendChild').mockImplementation(node => {
      if (node?.tagName === 'A') {
        throw new Error('append failed')
      }
      return HTMLElement.prototype.appendChild.call(document.body, node)
    })

    fireEvent.click(screen.getByLabelText('Download'))

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        'https://cdn.example.com/image.png',
        '_blank',
        'noopener,noreferrer'
      )
    })

    jest.restoreAllMocks()
    unmount()
    expect(consoleError).toHaveBeenCalled()
  })
})
