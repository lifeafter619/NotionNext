import { act, render, screen } from '@testing-library/react'
import SearchHighlightNav from '@/components/SearchHighlightNav'

const mockReplaceSearchResult = jest.fn()
const mockRouterReplace = jest.fn()
let mockRouterQuery = {}
let mockScrollIntoView = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/[prefix]/[slug]',
    query: mockRouterQuery,
    replace: mockRouterReplace
  })
}))

jest.mock('@/components/Mark', () => ({
  __esModule: true,
  default: (...args) => mockReplaceSearchResult(...args)
}))

describe('SearchHighlightNav', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockRouterQuery = { keyword: 'missing' }
    mockRouterReplace.mockClear()
    mockReplaceSearchResult.mockReset()
    mockReplaceSearchResult.mockResolvedValue()
    document.body.innerHTML =
      '<article id="notion-article">This article has no matching text.</article>'
    mockScrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = mockScrollIntoView
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    document.body.innerHTML = ''
  })

  it('shows a visible search panel for a keyword even when no text matches', async () => {
    render(<SearchHighlightNav />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(screen.getByText('内容定位')).toBeInTheDocument()
    expect(screen.getByText('未找到匹配')).toBeInTheDocument()
  })

  it('shows the number of matches after article text is highlighted', async () => {
    mockRouterQuery = { keyword: 'needle' }
    document.body.innerHTML =
      '<article id="notion-article">A needle appears here.</article>'
    mockReplaceSearchResult.mockImplementation(async ({ doms }) => {
      doms.innerHTML =
        'A <span class="search-highlight">needle</span> appears here.'
    })

    render(<SearchHighlightNav />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(screen.getByText('内容定位')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(mockScrollIntoView).toHaveBeenCalled()
  })

  it('starts article search from the browser search event', async () => {
    mockRouterQuery = {}
    document.body.innerHTML =
      '<article id="notion-article">A dispatched keyword appears here.</article>'
    mockReplaceSearchResult.mockImplementation(async ({ doms }) => {
      doms.innerHTML =
        'A <span class="search-highlight">dispatched</span> keyword appears here.'
    })

    render(<SearchHighlightNav />)

    act(() => {
      window.dispatchEvent(
        new CustomEvent('notionnext:article-search', {
          detail: { keyword: 'dispatched' }
        })
      )
    })

    await act(async () => {
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(screen.getByText('内容定位')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
