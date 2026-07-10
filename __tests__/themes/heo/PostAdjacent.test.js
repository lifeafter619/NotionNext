import { fireEvent, render } from '@testing-library/react'
import PostAdjacent from '@/themes/heo/components/PostAdjacent'

const mockRouter = {
  asPath: '/posts/current'
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    if (key === 'HEO_ARTICLE_ADJACENT') return true
    if (key === 'SUB_PATH') return ''
    return fallback
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: {
        NEXT_POST: '下一篇'
      }
    }
  })
}))

jest.mock('@/components/SmartLink', () =>
  function MockSmartLink({ href, children, passHref, ...props }) {
    void passHref
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
)

jest.mock('@/components/LazyImage', () =>
  function MockLazyImage({ src, alt, className }) {
    return <span data-src={src} aria-label={alt} className={className} />
  }
)

const prevPost = {
  id: 'prev-1',
  slug: 'previous',
  title: 'Previous article'
}

const nextPost = {
  id: 'next-1',
  slug: 'next',
  title: 'Next article'
}

function dragDesktopCard(card) {
  Object.defineProperty(card, 'offsetWidth', {
    configurable: true,
    value: 320
  })
  Object.defineProperty(card, 'offsetHeight', {
    configurable: true,
    value: 160
  })

  fireEvent.mouseDown(card, { clientX: 300, clientY: 300 })
  fireEvent.mouseMove(document, { clientX: 200, clientY: 200 })

  expect(card.style.transform).toContain('translate(')
}

describe('heo PostAdjacent responsive controls', () => {
  beforeEach(() => {
    window.IntersectionObserver = jest.fn(callback => ({
      observe: jest.fn(target => {
        callback([{ target, isIntersecting: true }])
      }),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }))
  })

  afterEach(() => {
    delete window.IntersectionObserver
  })

  it('ends the mobile navigation before the desktop card starts at md', () => {
    const { container } = render(
      <PostAdjacent prev={prevPost} next={nextPost} />
    )

    const mobileNavigation = container.querySelector('#article-end > section')
    const desktopNavigation = container.querySelector('#pc-next-post')

    expect(mobileNavigation).toHaveClass('md:hidden')
    expect(mobileNavigation).not.toHaveClass('lg:hidden')
    expect(desktopNavigation).toHaveClass('hidden')
    expect(desktopNavigation).toHaveClass('md:flex')
  })

  it('clears direct drag styles when a drag ends', () => {
    const { container } = render(
      <PostAdjacent prev={prevPost} next={nextPost} />
    )
    const desktopNavigation = container.querySelector('#pc-next-post')

    dragDesktopCard(desktopNavigation)
    fireEvent.mouseUp(document)

    expect(desktopNavigation.style.transform).toBe('')
    expect(desktopNavigation.style.transition).toBe('')
  })

  it('clears direct drag styles when adjacent posts change and on unmount', () => {
    const { container, rerender, unmount } = render(
      <PostAdjacent prev={prevPost} next={nextPost} />
    )
    const firstDesktopNavigation = container.querySelector('#pc-next-post')

    dragDesktopCard(firstDesktopNavigation)
    rerender(
      <PostAdjacent
        prev={{ ...prevPost, id: 'prev-2', slug: 'previous-2' }}
        next={{ ...nextPost, id: 'next-2', slug: 'next-2' }}
      />
    )

    expect(firstDesktopNavigation.style.transform).toBe('')
    expect(firstDesktopNavigation.style.transition).toBe('')

    const secondDesktopNavigation = container.querySelector('#pc-next-post')
    dragDesktopCard(secondDesktopNavigation)
    unmount()

    expect(secondDesktopNavigation.style.transform).toBe('')
    expect(secondDesktopNavigation.style.transition).toBe('')
  })

  it('clears direct drag styles when the responsive breakpoint changes', () => {
    const { container } = render(
      <PostAdjacent prev={prevPost} next={nextPost} />
    )
    const desktopNavigation = container.querySelector('#pc-next-post')

    dragDesktopCard(desktopNavigation)
    fireEvent(window, new Event('resize'))

    expect(desktopNavigation.style.transform).toBe('')
    expect(desktopNavigation.style.transition).toBe('')
  })
})
