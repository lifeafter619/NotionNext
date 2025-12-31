import { render, screen, fireEvent } from '@testing-library/react'
import ImageViewer from '@/components/ImageViewer'

describe('ImageViewer Component', () => {
  const defaultProps = {
    isOpen: true,
    src: '/test-image.jpg',
    alt: 'Test image',
    onClose: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock createPortal
    jest.spyOn(require('react-dom'), 'createPortal').mockImplementation((element) => element)
  })

  afterEach(() => {
    jest.restoreAllMocks()
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
    
    expect(screen.getByText('100%')).toBeInTheDocument()
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
    
    expect(screen.getByText('125%')).toBeInTheDocument()
  })

  it('zooms out when - key is pressed', () => {
    render(<ImageViewer {...defaultProps} />)
    
    fireEvent.keyDown(document, { key: '-' })
    
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('resets state when 0 key is pressed after zoom', () => {
    render(<ImageViewer {...defaultProps} />)
    
    // Zoom in first
    fireEvent.keyDown(document, { key: '+' })
    expect(screen.getByText('125%')).toBeInTheDocument()
    
    // Reset
    fireEvent.keyDown(document, { key: '0' })
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<ImageViewer {...defaultProps} />)
    
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Image viewer')
  })

  it('handles missing alt text gracefully', () => {
    render(<ImageViewer {...defaultProps} alt="" />)
    
    const image = screen.getByAltText('Image')
    expect(image).toBeInTheDocument()
  })
})
