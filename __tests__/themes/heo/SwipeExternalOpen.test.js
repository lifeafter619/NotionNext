import { act, fireEvent, render, screen } from '@testing-library/react'
import Swipe from '@/themes/heo/components/Swipe'

jest.mock('styled-jsx/style', () => () => null)

jest.mock('@/lib/config', () => ({
  siteConfig: key => (key === 'LINK' ? 'https://site.example' : null)
}))

jest.mock('next/link', () => {
  return function MockNextLink({ href, children, ...props }) {
    return (
      <a href={typeof href === 'string' ? href : href?.pathname} {...props}>
        {children}
      </a>
    )
  }
})

describe('HEO Swipe navigation and autoplay', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    jest.useFakeTimers()
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  })

  afterEach(() => {
    jest.useRealTimers()
    window.matchMedia = originalMatchMedia
  })

  it('keeps internal links in the current tab and secures external links', () => {
    render(
      <Swipe
        items={[
          { title: 'Internal notice', url: '/post' },
          {
            title: 'External notice',
            url: 'https://external.example/post'
          }
        ]}
      />
    )

    const internalLink = screen.getByRole('link', { name: 'Internal notice' })
    const externalLink = screen.getByRole('link', { name: 'External notice' })

    expect(internalLink).toHaveAttribute('href', '/post')
    expect(internalLink).not.toHaveAttribute('target')
    expect(externalLink).toHaveAttribute(
      'href',
      'https://external.example/post'
    )
    expect(externalLink).toHaveAttribute('target', '_blank')
    expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('pauses autoplay while hovered or focused and resumes afterward', () => {
    render(
      <Swipe
        items={[
          { title: 'First notice', url: '/first' },
          { title: 'Second notice', url: '/second' }
        ]}
      />
    )

    const firstLink = screen.getByRole('link', { name: 'First notice' })
    const secondLink = screen.getByRole('link', { name: 'Second notice' })
    const carousel = firstLink.parentElement

    fireEvent.mouseEnter(carousel)
    act(() => jest.advanceTimersByTime(3000))
    expect(firstLink).toHaveClass('translate-y-0')

    fireEvent.mouseLeave(carousel)
    act(() => jest.advanceTimersByTime(3000))
    expect(secondLink).toHaveClass('translate-y-0')

    fireEvent.focus(secondLink)
    act(() => jest.advanceTimersByTime(3000))
    expect(secondLink).toHaveClass('translate-y-0')

    fireEvent.blur(secondLink, { relatedTarget: document.body })
    act(() => jest.advanceTimersByTime(3000))
    expect(firstLink).toHaveClass('translate-y-0')
  })

  it('pauses for reduced motion and responds to preference changes', () => {
    const changeListeners = new Set()
    const mediaQuery = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: jest.fn((event, listener) => {
        if (event === 'change') changeListeners.add(listener)
      }),
      removeEventListener: jest.fn((event, listener) => {
        if (event === 'change') changeListeners.delete(listener)
      })
    }
    window.matchMedia = jest.fn(() => mediaQuery)

    const { unmount } = render(
      <Swipe
        items={[
          { title: 'First notice', url: '/first' },
          { title: 'Second notice', url: '/second' }
        ]}
      />
    )

    const firstLink = screen.getByRole('link', { name: 'First notice' })
    const secondLink = screen.getByRole('link', { name: 'Second notice' })

    act(() => jest.advanceTimersByTime(6000))
    expect(firstLink).toHaveClass('translate-y-0')

    act(() => {
      mediaQuery.matches = false
      changeListeners.forEach(listener => listener({ matches: false }))
    })
    act(() => jest.advanceTimersByTime(3000))
    expect(secondLink).toHaveClass('translate-y-0')

    unmount()
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )
    expect(changeListeners.size).toBe(0)
  })
})
