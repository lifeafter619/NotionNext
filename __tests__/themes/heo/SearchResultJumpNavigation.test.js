import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LayoutSearch } from '@/themes/heo'

const mockRouterPush = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/search/[keyword]',
    query: {},
    push: mockRouterPush
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      LINK: 'https://example.com',
      POST_LIST_STYLE: 'page'
    }
    return config[key] ?? false
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    fullWidth: false,
    isDarkMode: false,
    onLoading: false,
    locale: {
      COMMON: {
        NO_RESULTS_FOUND: 'No results',
        MORE: 'More',
        NO_MORE: 'No more',
        CATEGORY: 'Category'
      },
      NAV: {
        SEARCH: 'Search'
      },
      SEARCH: {
        ARTICLES: 'Articles',
        TAGS: 'Tags'
      }
    }
  })
}))

jest.mock('@/lib/plugins/algoliaConfig', () => ({
  isAlgoliaSearchEnabled: jest.fn(() => false)
}))
jest.mock('@/lib/plugins/wow', () => ({
  loadWowJS: jest.fn()
}))
jest.mock('@/components/Mark', () => jest.fn())
jest.mock('algoliasearch', () => jest.fn())
jest.mock('@/components/GoogleAdsense', () => ({
  AdSlot: () => null
}))
jest.mock('@/components/HeroIcons', () => ({
  HashTag: () => null
}))
jest.mock('@/components/LazyImage', () => {
  return function LazyImage({ priority: _priority, alt, ...props }) {
    return <img alt={alt || 'cover'} {...props} />
  }
})
jest.mock('@/components/LoadingCover', () => () => null)
jest.mock('@/components/SearchHighlightNav', () => () => null)
jest.mock('@/components/ArticleExpirationNotice', () => () => null)
jest.mock('@/components/SmartLink', () => {
  return function SmartLink({ href, children, ...props }) {
    return (
      <a href={typeof href === 'string' ? href : href?.pathname} {...props}>
        {children}
      </a>
    )
  }
})
jest.mock('@/themes/heo/components/SearchNav', () => () => null)
jest.mock('@/themes/heo/components/CategoryBar', () => () => null)
jest.mock('@/themes/heo/components/Header', () => () => null)
jest.mock('@/themes/heo/components/Hero', () => () => null)
jest.mock('@/themes/heo/components/PostHeader', () => () => null)
jest.mock('@/themes/heo/components/Footer', () => () => null)
jest.mock('@/themes/heo/components/FloatTocButton', () => () => null)
jest.mock('@/themes/heo/components/LatestPostsGroup', () => () => null)
jest.mock('@/themes/heo/components/NoticeBar', () => ({
  NoticeBar: () => null
}))
jest.mock('@/themes/heo/components/PostLock', () => ({
  PostLock: () => null
}))
jest.mock('@/themes/heo/components/SideRight', () => () => null)
jest.mock('@/themes/heo/style', () => ({
  Style: () => null
}))

const { isAlgoliaSearchEnabled } = require('@/lib/plugins/algoliaConfig')
const algoliasearch = require('algoliasearch')

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('heo search result jump navigation', () => {
  beforeEach(() => {
    mockRouterPush.mockClear()
    mockRouterPush.mockResolvedValue(true)
    isAlgoliaSearchEnabled.mockReturnValue(false)
    algoliasearch.mockReset()
  })

  it('uses client-side navigation when jumping to a search match', async () => {
    render(
      <LayoutSearch
        keyword='hello 世界'
        posts={[
          {
            id: 'post-1',
            title: 'Demo post',
            summary: 'Summary',
            content: 'This body contains hello 世界 in the article.',
            href: '/demo-post',
            slug: 'demo-post',
            createdTime: '2026-05-30T00:00:00Z'
          }
        ]}
        postCount={1}
        siteInfo={{ pageCover: '/cover.jpg' }}
        categoryOptions={[]}
        tagOptions={[]}
      />
    )

    fireEvent.click(screen.getByText('跳转到搜索位置'))

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/demo-post?keyword=hello%20%E4%B8%96%E7%95%8C'
      )
    })
  })

  it('uses an inline status instead of the slow full-page search message while Algolia is pending', async () => {
    isAlgoliaSearchEnabled.mockReturnValue(true)
    const pendingSearch = createDeferred()
    const search = jest.fn(() => pendingSearch.promise)
    algoliasearch.mockReturnValue({
      initIndex: () => ({ search })
    })

    render(
      <LayoutSearch
        keyword='slow'
        posts={[
          {
            id: 'post-1',
            title: 'Fallback post',
            summary: 'Summary',
            href: '/fallback-post',
            slug: 'fallback-post'
          }
        ]}
        postCount={1}
        siteInfo={{ pageCover: '/cover.jpg' }}
        categoryOptions={[]}
        tagOptions={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('正在搜索')
    })
    expect(screen.queryByText(/搜索较慢/)).not.toBeInTheDocument()
  })

  it('does not let stale Algolia responses replace the latest search results', async () => {
    isAlgoliaSearchEnabled.mockReturnValue(true)
    const alphaSearch = createDeferred()
    const betaSearch = createDeferred()
    const search = jest.fn(keyword => {
      if (keyword === 'alpha') return alphaSearch.promise
      return betaSearch.promise
    })
    algoliasearch.mockReturnValue({
      initIndex: () => ({ search })
    })

    const baseProps = {
      posts: [],
      postCount: 0,
      siteInfo: {},
      categoryOptions: [],
      tagOptions: []
    }
    const { rerender } = render(<LayoutSearch keyword='alpha' {...baseProps} />)

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith(
        'alpha',
        expect.objectContaining({
          attributesToSnippet: ['content:150', 'summary:100']
        })
      )
    })

    rerender(<LayoutSearch keyword='beta' {...baseProps} />)

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith(
        'beta',
        expect.objectContaining({
          attributesToSnippet: ['content:150', 'summary:100']
        })
      )
    })

    await act(async () => {
      betaSearch.resolve({
        hits: [
          {
            objectID: 'beta-id',
            slug: 'beta-post',
            title: 'Beta post',
            summary: 'Beta summary'
          }
        ]
      })
      await Promise.resolve()
    })

    expect(await screen.findByText('Beta post')).toBeInTheDocument()

    await act(async () => {
      alphaSearch.resolve({
        hits: [
          {
            objectID: 'alpha-id',
            slug: 'alpha-post',
            title: 'Alpha post',
            summary: 'Alpha summary'
          }
        ]
      })
      await Promise.resolve()
    })

    expect(screen.queryByText('Alpha post')).not.toBeInTheDocument()
    expect(screen.getByText('Beta post')).toBeInTheDocument()
  })

  it('shows a retryable service error instead of the empty state when Algolia rejects', async () => {
    isAlgoliaSearchEnabled.mockReturnValue(true)
    const failedSearch = createDeferred()
    const retrySearch = createDeferred()
    const search = jest
      .fn()
      .mockImplementationOnce(() => failedSearch.promise)
      .mockImplementationOnce(() => retrySearch.promise)
    algoliasearch.mockReturnValue({
      initIndex: () => ({ search })
    })

    render(
      <LayoutSearch
        keyword='service-error'
        posts={[]}
        postCount={0}
        siteInfo={{}}
        categoryOptions={[]}
        tagOptions={[]}
      />
    )

    await act(async () => {
      failedSearch.reject(new Error('Algolia unavailable'))
      await Promise.resolve()
    })

    expect(
      await screen.findByText('搜索服务暂时不可用，请稍后重试')
    ).toBeInTheDocument()
    expect(screen.queryByText('未找到相关文章')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重试' }))

    await waitFor(() => {
      expect(search).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      retrySearch.resolve({
        hits: [
          {
            objectID: 'recovered-id',
            slug: 'recovered-post',
            title: 'Recovered post',
            summary: 'Recovered summary'
          }
        ]
      })
      await Promise.resolve()
    })

    expect(await screen.findByText('Recovered post')).toBeInTheDocument()
  })

  it('shows the normal empty state when Algolia succeeds without hits', async () => {
    isAlgoliaSearchEnabled.mockReturnValue(true)
    const search = jest.fn().mockResolvedValue({ hits: [] })
    algoliasearch.mockReturnValue({
      initIndex: () => ({ search })
    })

    render(
      <LayoutSearch
        keyword='nothing-here'
        posts={[]}
        postCount={0}
        siteInfo={{}}
        categoryOptions={[]}
        tagOptions={[]}
      />
    )

    expect(await screen.findByText('未找到相关文章')).toBeInTheDocument()
    expect(
      screen.queryByText('搜索服务暂时不可用，请稍后重试')
    ).not.toBeInTheDocument()
  })

  it('formats Algolia result dates as YYYY-MM-DD in Asia/Shanghai', async () => {
    isAlgoliaSearchEnabled.mockReturnValue(true)
    const search = jest.fn().mockResolvedValue({
      hits: [
        {
          objectID: 'date-id',
          slug: 'date-post',
          title: 'Shanghai date post',
          summary: 'Date summary',
          createdTime: '2026-07-09T16:30:00.000Z'
        }
      ]
    })
    algoliasearch.mockReturnValue({
      initIndex: () => ({ search })
    })

    render(
      <LayoutSearch
        keyword='date'
        posts={[]}
        postCount={0}
        siteInfo={{}}
        categoryOptions={[]}
        tagOptions={[]}
      />
    )

    expect(await screen.findByText('Shanghai date post')).toBeInTheDocument()
    expect(screen.getByText('2026-07-10')).toBeInTheDocument()
  })

  it('invalidates an in-flight Algolia response when the keyword is cleared', async () => {
    isAlgoliaSearchEnabled.mockReturnValue(true)
    const pendingSearch = createDeferred()
    const search = jest.fn(() => pendingSearch.promise)
    algoliasearch.mockReturnValue({
      initIndex: () => ({ search })
    })

    const baseProps = {
      posts: [],
      postCount: 0,
      siteInfo: {},
      categoryOptions: [],
      tagOptions: []
    }
    const { rerender } = render(
      <LayoutSearch keyword='temporary' {...baseProps} />
    )

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith(
        'temporary',
        expect.objectContaining({
          attributesToSnippet: ['content:150', 'summary:100']
        })
      )
    })

    rerender(<LayoutSearch keyword='' {...baseProps} />)

    await act(async () => {
      pendingSearch.resolve({
        hits: [
          {
            objectID: 'late-id',
            slug: 'late-post',
            title: 'Late response post',
            summary: 'Late summary'
          }
        ]
      })
      await Promise.resolve()
    })

    expect(screen.queryByText('Late response post')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
