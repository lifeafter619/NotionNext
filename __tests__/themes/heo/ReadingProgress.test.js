import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from '@/themes/heo/components/Header'
import ReadingProgress from '@/themes/heo/components/ReadingProgress'

jest.mock('next/router', () => ({
  useRouter: () => ({
    asPath: '/posts/demo'
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      AUTHOR: 'Author',
      TITLE: 'Site title',
      BIO: 'Bio',
      THEME_SWITCH: false
    }
    return config[key] ?? false
  })
}))

jest.mock('@/components/HeroIcons', () => ({
  ArrowSmallUp: props => <svg data-testid='arrow-up' {...props} />
}))

jest.mock('@/themes/heo/components/DarkModeButton', () => () => null)
jest.mock('@/themes/heo/components/Logo', () => () => null)
jest.mock('@/themes/heo/components/MenuListTop', () => ({
  MenuListTop: () => null
}))
jest.mock('@/themes/heo/components/RandomPostButton', () => () => null)
jest.mock('@/themes/heo/components/SearchButton', () => () => null)
jest.mock('next/dynamic', () => () => () => null)
jest.mock('styled-jsx/style', () => () => null)

function setScrollMetrics({ scrollHeight, clientHeight, scrollY }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight
  })
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    value: clientHeight
  })
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: scrollY
  })
  Object.defineProperty(window, 'pageYOffset', {
    configurable: true,
    value: scrollY
  })
}

describe('heo ReadingProgress', () => {
  let animationFrameCallback
  const originalRequestAnimationFrame = window.requestAnimationFrame
  const originalCancelAnimationFrame = window.cancelAnimationFrame

  beforeEach(() => {
    animationFrameCallback = null
    window.requestAnimationFrame = jest.fn(callback => {
      animationFrameCallback = callback
      return 1
    })
    window.cancelAnimationFrame = jest.fn()
  })

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame
    window.cancelAnimationFrame = originalCancelAnimationFrame
  })

  test.each([
    ['negative scrolling', -50, 1000, 500, 0],
    ['normal scrolling', 250, 1000, 500, 50],
    ['scrolling beyond the document', 800, 1000, 500, 100],
    ['a document with no scrollable height', 100, 500, 500, 0]
  ])(
    'keeps progress finite and within bounds for %s',
    (_caseName, scrollY, scrollHeight, clientHeight, expectedProgress) => {
      setScrollMetrics({ scrollHeight, clientHeight, scrollY })
      render(<ReadingProgress title='Demo article' />)

      fireEvent.scroll(window)
      act(() => animationFrameCallback())

      const progressButton = screen.getByRole('button', {
        name: `Demo article，阅读进度 ${expectedProgress}%，返回顶部`
      })
      const progress = Number(
        progressButton.getAttribute('data-scroll-percentage')
      )

      expect(Number.isFinite(progress)).toBe(true)
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(progress).toBeLessThanOrEqual(100)
      expect(progress).toBe(expectedProgress)
    }
  )

  it('uses the current article title as the accessible progress label', () => {
    render(<Header post={{ title: 'Current article' }} />)

    expect(
      screen.getByRole('button', {
        name: 'Current article，阅读进度 0%，返回顶部'
      })
    ).toHaveAttribute('title', 'Current article')
  })

  it('uses a stable accessible fallback when the article has no title', () => {
    render(<Header post={{}} />)

    expect(
      screen.getByRole('button', {
        name: '阅读进度，阅读进度 0%，返回顶部'
      })
    ).toHaveAttribute('title', '阅读进度')
  })

  it('returns to the top when activated from the keyboard', async () => {
    const user = userEvent.setup()
    render(<ReadingProgress title='Keyboard article' />)

    const progressButton = screen.getByRole('button', {
      name: 'Keyboard article，阅读进度 0%，返回顶部'
    })
    progressButton.focus()
    await user.keyboard('{Enter}')

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth'
    })

    await user.click(screen.getByRole('button', { name: '回到原位置' }))
  })
})
