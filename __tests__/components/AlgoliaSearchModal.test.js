import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import AlgoliaSearchModal from '@/components/AlgoliaSearchModal'

const searchMock = jest.fn()
const mockRouterPush = jest.fn()

jest.mock('algoliasearch', () => {
  return jest.fn(() => ({
    initIndex: jest.fn(() => ({
      search: searchMock
    }))
  }))
})

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      ALGOLIA_APP_ID: 'app-id',
      ALGOLIA_SEARCH_ONLY_APP_KEY: global.__ALGOLIA_SEARCH_KEY__ ?? null,
      ALGOLIA_INDEX: global.__ALGOLIA_INDEX__ ?? null,
      SUB_PATH: ''
    }
    return config[key] ?? null
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    tagOptions: []
  })
}))

jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: mockRouterPush,
    pop: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    isFallback: false
  })
}))

jest.mock('react-hotkeys-hook', () => ({
  useHotkeys: jest.fn()
}))

describe('AlgoliaSearchModal', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    global.__ALGOLIA_SEARCH_KEY__ = null
    global.__ALGOLIA_INDEX__ = null
    searchMock.mockResolvedValue({
      hits: [],
      nbHits: 0,
      nbPages: 0,
      processingTimeMS: 1
    })
    mockRouterPush.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
    delete global.__ALGOLIA_SEARCH_KEY__
    delete global.__ALGOLIA_INDEX__
  })

  it('does not initialize Algolia when public search configuration is incomplete', () => {
    const algoliasearchMock = require('algoliasearch')
    const { container } = render(
      <AlgoliaSearchModal cRef={React.createRef()} />
    )

    expect(container).toBeEmptyDOMElement()
    expect(algoliasearchMock).not.toHaveBeenCalled()
  })

  it('uses the selected search scope for searches typed after filters change', async () => {
    global.__ALGOLIA_SEARCH_KEY__ = 'search-key'
    global.__ALGOLIA_INDEX__ = 'posts'

    render(<AlgoliaSearchModal cRef={React.createRef()} />)

    fireEvent.keyDown(document, { key: 'k', code: 'KeyK', ctrlKey: true })
    fireEvent.click(screen.getByText('筛选'))
    fireEvent.click(screen.getByText('标题'))
    fireEvent.change(
      screen.getByPlaceholderText('搜索文章标题、内容、标签、分类...'),
      {
        target: { value: 'notion' }
      }
    )

    await act(async () => {
      jest.advanceTimersByTime(1800)
      await Promise.resolve()
    })

    await waitFor(() => expect(searchMock).toHaveBeenCalled())
    expect(searchMock).toHaveBeenLastCalledWith('notion', {
      page: 0,
      hitsPerPage: 10,
      restrictSearchableAttributes: ['title']
    })
  })

  it('opens the result the user clicks even when it is not active yet', async () => {
    global.__ALGOLIA_SEARCH_KEY__ = 'search-key'
    global.__ALGOLIA_INDEX__ = 'posts'
    searchMock.mockResolvedValue({
      hits: [
        { objectID: 'first-id', slug: 'first-post', title: 'First result' },
        { objectID: 'second-id', slug: 'second-post', title: 'Second result' }
      ],
      nbHits: 2,
      nbPages: 1,
      processingTimeMS: 1
    })

    render(<AlgoliaSearchModal cRef={React.createRef()} />)

    fireEvent.change(
      screen.getByPlaceholderText('搜索文章标题、内容、标签、分类...'),
      {
        target: { value: 'notion' }
      }
    )

    await act(async () => {
      jest.advanceTimersByTime(1800)
      await Promise.resolve()
    })

    await screen.findByText('Second result')
    fireEvent.click(screen.getByText('Second result'))

    expect(mockRouterPush).toHaveBeenCalledWith('/second-post?keyword=notion')
  })
})
