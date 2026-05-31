import { act, render, screen, waitFor } from '@testing-library/react'
import BlogPostCard from '@/themes/gitbook/components/BlogPostCard'
import NavPostList from '@/themes/gitbook/components/NavPostList'

let mockAsPath = '/'

jest.mock('next/router', () => ({
  useRouter: () => ({
    asPath: mockAsPath
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) => {
    const config = {
      DESCRIPTION: 'Home',
      GITBOOK_EXCLUSIVE_COLLAPSE: false,
      GITBOOK_FOLDER_HOVER_EXPAND: false,
      GITBOOK_INDEX_PAGE: '/',
      GITBOOK_LATEST_POST_RED_BADGE: false,
      POST_TITLE_ICON: false
    }
    return config[key] ?? defaultValue ?? ''
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    currentSearch: '',
    locale: {
      COMMON: {
        NO_RESULTS_FOUND: 'No results'
      }
    }
  })
}))

jest.mock('@/components/SmartLink', () => {
  const MockSmartLink = ({ href, children }) => <a href={href}>{children}</a>
  MockSmartLink.displayName = 'MockSmartLink'
  return MockSmartLink
})

describe('gitbook malformed current path handling', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockAsPath = '/article/bad%path?x=1'
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('does not crash while checking the selected post card', () => {
    expect(() =>
      render(
        <BlogPostCard
          post={{ id: 'post1', title: 'Bad Path', href: '/article/bad%path' }}
        />
      )
    ).not.toThrow()
  })

  it('does not crash while expanding the current navigation folder', async () => {
    render(
      <NavPostList
        filteredNavPages={[
          {
            id: 'post1',
            title: 'Bad Path',
            href: '/article/bad%path',
            category: 'Docs'
          }
        ]}
      />
    )

    act(() => {
      jest.advanceTimersByTime(500)
    })

    await waitFor(() => {
      expect(screen.getByText('Bad Path')).toBeInTheDocument()
    })
  })
})
