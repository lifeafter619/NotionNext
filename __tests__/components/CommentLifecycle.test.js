import { act, render, screen } from '@testing-library/react'
import Comment from '@/components/Comment'

const mockSiteConfig = jest.fn(key => key === 'COMMENT_NOTION_ENABLE')
const observerInstances = []

jest.mock('@/lib/config', () => ({
  siteConfig: (...args) => mockSiteConfig(...args)
}))

jest.mock('@/lib/utils', () => ({
  isBrowser: true,
  isSearchEngineBot: false
}))

jest.mock('@/components/Tabs', () => {
  return function MockTabs({ children }) {
    return <div>{children}</div>
  }
})
jest.mock('@/components/Artalk', () => () => null)
jest.mock('next/dynamic', () => () => {
  return function MockCommentProvider() {
    return <div data-testid='mock-comment-provider'>comments loaded</div>
  }
})

describe('Comment lifecycle', () => {
  beforeEach(() => {
    observerInstances.length = 0
    global.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback) {
        this.callback = callback
        this.observe = jest.fn()
        this.unobserve = jest.fn()
        this.disconnect = jest.fn()
        observerInstances.push(this)
      }
    }
  })

  it('does not reuse loaded comment state for a different article', () => {
    const { rerender } = render(<Comment frontMatter={{ id: 'post-a' }} />)

    act(() => {
      observerInstances[0].callback([
        { isIntersecting: true, target: document.getElementById('comment') }
      ])
    })
    expect(screen.getByTestId('mock-comment-provider')).toBeInTheDocument()

    rerender(<Comment frontMatter={{ id: 'post-b' }} />)

    expect(
      screen.queryByTestId('mock-comment-provider')
    ).not.toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('disconnects its observer when unmounted', () => {
    const { unmount } = render(<Comment frontMatter={{ id: 'post-a' }} />)
    const observer = observerInstances[0]

    unmount()

    expect(observer.disconnect).toHaveBeenCalledTimes(1)
  })
})
