import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    render(<LazyImage {...defaultProps} width={300} height={200} />)

    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('width', '300')
    expect(image).toHaveAttribute('height', '200')
  })

  it('uses fixed pixel sizes for fixed-width images', () => {
    render(
      <LazyImage
        {...defaultProps}
        src='https://example.com/avatar.jpg?width=1200'
        width={120}
        height={120}
      />
    )

    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('sizes', '120px')
  })

  it('omits invalid auto width and height attributes when dimensions are not provided', () => {
    render(<LazyImage {...defaultProps} />)

    const image = screen.getByAltText('Test image')
    expect(image).not.toHaveAttribute('width')
    expect(image).not.toHaveAttribute('height')
  })

  it('handles priority loading', () => {
    render(<LazyImage {...defaultProps} priority />)

    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('loading', 'eager')
  })

  it('marks priority images as high fetch priority', () => {
    render(<LazyImage {...defaultProps} priority />)

    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('fetchpriority', 'high')
  })

  it('uses the optimized image URL immediately for priority images', () => {
    const originalInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 640
    })

    try {
      render(
        <LazyImage
          {...defaultProps}
          src='https://images.unsplash.com/photo.jpg?width=1080&q=80'
          priority
        />
      )

      const image = screen.getByAltText('Test image')
      expect(image.getAttribute('src')).toContain('width=640')
      expect(image.getAttribute('src')).not.toContain('data:image/gif')
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth
      })
    }
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
    const OriginalImage = global.Image
    // jsdom does not finish decoding remote URLs; defer onload until after handlers attach (matches browser ordering).
    global.Image = class MockImage {
      constructor() {
        this.onload = null
      }

      set src(_val) {
        queueMicrotask(() => {
          if (this.onload) this.onload()
        })
      }
    }

    try {
      render(<LazyImage {...defaultProps} priority onLoad={handleLoad} />)
      await waitFor(() => {
        expect(handleLoad).toHaveBeenCalled()
      })
    } finally {
      global.Image = OriginalImage
    }
  })

  it('handles error gracefully', () => {
    render(<LazyImage {...defaultProps} />)

    const image = screen.getByAltText('Test image')

    // Simulate image error
    fireEvent.error(image)

    // Component should still be in the document
    expect(image).toBeInTheDocument()
  })

  it('falls back past a failed relative fallback image', () => {
    render(
      <LazyImage
        {...defaultProps}
        fallbackSrc='/broken-fallback.jpg'
        placeholderSrc='/placeholder.jpg'
      />
    )

    const image = screen.getByAltText('Test image')
    fireEvent.error(image)
    expect(image).toHaveAttribute('src', '/broken-fallback.jpg')

    fireEvent.error(image)
    expect(image).toHaveAttribute('src', '/placeholder.jpg')
  })

  it('applies correct decoding attribute', () => {
    render(<LazyImage {...defaultProps} />)

    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('decoding', 'async')
  })

  it('handles missing src gracefully', () => {
    const { container } = render(<LazyImage alt='Test image' />)

    expect(container.firstChild).toBeNull()
  })

  it('applies custom styles', () => {
    const customStyle = { border: '1px solid red' }
    render(<LazyImage {...defaultProps} style={customStyle} />)

    const image = screen.getByAltText('Test image')
    expect(image).toHaveStyle('border: 1px solid red')
  })

  it('does not expose real srcset before lazy image loading starts', () => {
    const notionSrc = 'https://example.com/image.jpg?width=1200'
    render(<LazyImage {...defaultProps} src={notionSrc} />)

    const image = screen.getByAltText('Test image')
    expect(image).not.toHaveAttribute('srcset')
  })

  it('generates srcset for priority Notion-like image URLs', () => {
    const notionSrc = 'https://example.com/image.jpg?width=1200'
    render(<LazyImage {...defaultProps} src={notionSrc} priority />)

    const image = screen.getByAltText('Test image')
    expect(image).toHaveAttribute('srcset')
    expect(image.getAttribute('srcset')).toContain('320w')
    expect(image.getAttribute('srcset')).toContain('640w')
  })

  it('adds srcset after a lazy image enters the viewport', async () => {
    const OriginalImage = global.Image
    const OriginalIntersectionObserver = global.IntersectionObserver

    global.Image = class MockImage {
      constructor() {
        this.onload = null
      }

      set src(_val) {
        queueMicrotask(() => {
          if (this.onload) this.onload()
        })
      }
    }
    global.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback) {
        this.callback = callback
      }

      observe(target) {
        this.callback([{ isIntersecting: true, target }])
      }

      unobserve() {}
    }

    try {
      const notionSrc = 'https://example.com/image.jpg?width=1200'
      render(<LazyImage {...defaultProps} src={notionSrc} />)

      const image = screen.getByAltText('Test image')
      await waitFor(() => {
        expect(image).toHaveAttribute('srcset')
      })
      expect(image.getAttribute('srcset')).toContain('320w')
    } finally {
      global.Image = OriginalImage
      global.IntersectionObserver = OriginalIntersectionObserver
    }
  })

  it('uses viewport width instead of physical screen width for optimized image URLs', async () => {
    const OriginalImage = global.Image
    const originalInnerWidth = window.innerWidth
    const originalScreenWidth = window.screen.width

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 480
    })
    Object.defineProperty(window.screen, 'width', {
      configurable: true,
      value: 1920
    })

    global.Image = class MockImage {
      constructor() {
        this.onload = null
      }

      set src(_val) {
        queueMicrotask(() => {
          if (this.onload) this.onload()
        })
      }
    }

    try {
      render(
        <LazyImage
          {...defaultProps}
          src='https://images.unsplash.com/photo.jpg?width=1080&q=80'
          priority
        />
      )

      const image = screen.getByAltText('Test image')
      await waitFor(() => {
        expect(image.getAttribute('src')).toContain('width=480')
      })
    } finally {
      global.Image = OriginalImage
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth
      })
      Object.defineProperty(window.screen, 'width', {
        configurable: true,
        value: originalScreenWidth
      })
    }
  })
})
