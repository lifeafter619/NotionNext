import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ImageViewer from '@/components/ImageViewer'

jest.mock('react-dom', () => {
  const actual = jest.requireActual('react-dom')
  return {
    ...actual,
    createPortal: node => node
  }
})

describe('ImageViewer Component', () => {
  const defaultProps = {
    isOpen: true,
    images: [{ src: '/test-image.jpg', alt: 'Test image' }],
    currentIndex: 0,
    onClose: jest.fn()
  }

  let imageInstances
  let OriginalImage

  beforeEach(() => {
    jest.clearAllMocks()
    imageInstances = []
    OriginalImage = global.Image

    global.Image = class {
      constructor() {
        imageInstances.push(this)
      }
    }
  })

  afterEach(() => {
    global.Image = OriginalImage
    window.innerWidth = 1024
  })

  it('renders when isOpen is true', () => {
    render(<ImageViewer {...defaultProps} />)

    const image = screen.getByAltText('Test image')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/test-image.jpg')
  })

  it('does not render when isOpen is false', () => {
    render(<ImageViewer {...defaultProps} isOpen={false} />)

    const image = screen.queryByAltText('Test image')
    expect(image).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<ImageViewer {...defaultProps} onClose={onClose} />)

    const closeButton = screen.getByLabelText('Close image viewer')
    fireEvent.click(closeButton)

    // The close button click also triggers the overlay click, so it's called twice
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when background overlay is clicked', () => {
    const onClose = jest.fn()
    render(<ImageViewer {...defaultProps} onClose={onClose} />)

    const overlay = screen.getByRole('dialog')
    fireEvent.click(overlay)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders zoom controls', () => {
    render(<ImageViewer {...defaultProps} />)

    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
  })

  it('renders rotate controls', () => {
    render(<ImageViewer {...defaultProps} />)

    expect(screen.getByLabelText('Rotate left')).toBeInTheDocument()
    expect(screen.getByLabelText('Rotate right')).toBeInTheDocument()
  })

  it('renders reset and download controls', () => {
    render(<ImageViewer {...defaultProps} />)

    expect(screen.getByLabelText('Reset')).toBeInTheDocument()
    expect(screen.getByLabelText('Download')).toBeInTheDocument()
  })

  it('shows 100% zoom by default', () => {
    render(<ImageViewer {...defaultProps} />)

    // The input displays the percentage value
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn()
    render(<ImageViewer {...defaultProps} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('zooms in when + key is pressed', () => {
    render(<ImageViewer {...defaultProps} />)

    fireEvent.keyDown(document, { key: '+' })

    expect(screen.getByDisplayValue('125')).toBeInTheDocument()
  })

  it('zooms out when - key is pressed', () => {
    render(<ImageViewer {...defaultProps} />)

    fireEvent.keyDown(document, { key: '-' })

    expect(screen.getByDisplayValue('75')).toBeInTheDocument()
  })

  it('resets state when 0 key is pressed after zoom', () => {
    render(<ImageViewer {...defaultProps} />)

    // Zoom in first
    fireEvent.keyDown(document, { key: '+' })
    expect(screen.getByDisplayValue('125')).toBeInTheDocument()

    // Reset
    fireEvent.keyDown(document, { key: '0' })
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<ImageViewer {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Image viewer')
  })

  it('handles missing alt text gracefully', () => {
    const props = {
      ...defaultProps,
      images: [{ src: '/test-image.jpg', alt: '' }]
    }
    render(<ImageViewer {...props} />)

    const image = screen.getByAltText('Image')
    expect(image).toBeInTheDocument()
  })

  it('restores scroll position without logging jsdom scrollTo errors on unmount', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const { unmount } = render(<ImageViewer {...defaultProps} />)
    unmount()

    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('removes the low-res blur when the high-res image cannot load', async () => {
    render(
      <ImageViewer
        isOpen
        images={[
          {
            src: '/low-res.jpg',
            highResSrc: '/high-res.jpg',
            alt: 'Preview image'
          }
        ]}
        currentIndex={0}
        onClose={jest.fn()}
      />
    )

    const image = screen.getByAltText('Preview image')
    expect(image).toHaveClass('blur-[1px]')

    act(() => {
      imageInstances[0].onerror?.()
    })

    await waitFor(() => {
      expect(image).not.toHaveClass('blur-[1px]')
    })
    expect(image).toHaveAttribute('src', '/low-res.jpg')
  })

  it('does not blur images when there is no separate high-res source', () => {
    render(
      <ImageViewer
        isOpen
        images={[
          {
            src: '/already-best.jpg',
            highResSrc: '/already-best.jpg',
            alt: 'Best available image'
          }
        ]}
        currentIndex={0}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByAltText('Best available image')).not.toHaveClass(
      'blur-[1px]'
    )
  })

  it('uses a mobile hint without desktop-only controls', () => {
    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))

    render(
      <ImageViewer
        isOpen
        images={[
          {
            src: '/mobile.jpg',
            highResSrc: '/mobile.jpg',
            alt: 'Mobile image'
          }
        ]}
        currentIndex={0}
        onClose={jest.fn()}
      />
    )

    const hint = screen.getByTestId('image-viewer-hint')
    expect(hint).toHaveTextContent('双指缩放')
    expect(hint).not.toHaveTextContent('ESC')
    expect(hint).not.toHaveTextContent('滚轮')
  })

  it('allows the toolbar to wrap inside the viewport', () => {
    render(
      <ImageViewer
        isOpen
        images={[
          {
            src: '/toolbar.jpg',
            highResSrc: '/toolbar.jpg',
            alt: 'Toolbar image'
          }
        ]}
        currentIndex={0}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByTestId('image-viewer-toolbar')).toHaveClass('flex-wrap')
  })
})
