import { render, screen, waitFor } from '@testing-library/react'
import LazyImage from '@/components/LazyImage'

describe('LazyImage Component', () => {
  const defaultProps = {
    src: '/test-image.jpg',
    alt: 'Test image'
  }

  it('renders with required props', () => {
    render(<LazyImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('alt', 'Test image')
  })

  it('applies custom className', () => {
    const customClass = 'custom-image-class'
    render(<LazyImage {...defaultProps} className={customClass} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveClass(customClass)
  })

  it('sets width and height attributes', () => {
    render(
      <LazyImage 
        {...defaultProps} 
        width={300} 
        height={200} 
      />
    )
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('width', '300')
    expect(image).toHaveAttribute('height', '200')
  })

  it('handles priority loading', () => {
    render(<LazyImage {...defaultProps} priority />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('loading', 'eager')
  })

  it('uses lazy loading by default', () => {
    render(<LazyImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<LazyImage {...defaultProps} onClick={handleClick} />)
    
    const image = screen.getByAltText('Test image')
    image.click()
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('handles load event', async () => {
    const handleLoad = jest.fn()
    render(<LazyImage {...defaultProps} onLoad={handleLoad} />)
    
    const image = screen.getByAltText('Test image')
    
    // Simulate image load
    Object.defineProperty(image, 'complete', { value: true })
    image.dispatchEvent(new Event('load'))
    
    await waitFor(() => {
      expect(handleLoad).toHaveBeenCalled()
    })
  })

  it('handles error gracefully', () => {
    render(<LazyImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    
    // Simulate image error
    image.dispatchEvent(new Event('error'))
    
    // Component should still be in the document
    expect(image).toBeInTheDocument()
  })

  it('applies correct decoding attribute', () => {
    render(<LazyImage {...defaultProps} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('decoding', 'async')
  })

  it('handles missing src gracefully', () => {
    render(<LazyImage alt="Test image" />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toBeInTheDocument()
  })

  it('applies custom styles', () => {
    const customStyle = { border: '1px solid red' }
    render(<LazyImage {...defaultProps} style={customStyle} />)
    
    const image = screen.getByAltText('Test image')
    expect(image).toHaveStyle('border: 1px solid red')
  })

  it('generates srcset for Notion-like image URLs', () => {
    const notionSrc = 'https://example.com/image.jpg?width=1200'
    render(<LazyImage {...defaultProps} src={notionSrc} />)

    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('srcset')
    expect(image.getAttribute('srcset')).toContain('320w')
    expect(image.getAttribute('srcset')).toContain('640w')
  })
})
