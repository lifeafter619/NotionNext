import { fireEvent, render, screen } from '@testing-library/react'
import PostHeader from '@/themes/heo/components/PostHeader'

const mockRouterPush = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/[prefix]/[slug]',
    query: {
      prefix: 'zh-CN',
      slug: 'article/demo',
      existing: '1'
    },
    push: mockRouterPush
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    setOnLoading: jest.fn(),
    isDarkMode: false,
    locale: {
      COMMON: {
        WORD_COUNT: 'Words',
        READ_TIME: 'Read',
        MINUTE: 'min'
      }
    }
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(() => false)
}))

jest.mock('@/components/LazyImage', () => {
  return function LazyImage(props) {
    return <img alt={props.alt || 'cover'} {...props} />
  }
})

jest.mock('@/components/NotionIcon', () => () => null)
jest.mock('@/components/WordCount', () => () => null)
jest.mock('@/components/SmartLink', () => {
  return function SmartLink({
    href,
    children,
    passHref: _passHref,
    legacyBehavior: _legacyBehavior,
    ...props
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})
jest.mock('@/themes/heo/components/WavesArea', () => () => null)
jest.mock('styled-jsx/style', () => () => null)

describe('heo PostHeader article search', () => {
  beforeEach(() => {
    mockRouterPush.mockClear()
  })

  const post = {
    title: 'Demo Post',
    category: 'Tech',
    publishDate: '2026-05-30',
    publishDay: '2026-05-30',
    lastEditedDay: '2026-05-30',
    type: 'Post',
    wordCount: 100,
    readTime: 1,
    tagItems: []
  }

  it('updates keyword query with shallow client-side routing when pressing Enter', () => {
    render(<PostHeader post={post} siteInfo={{ pageCover: '/cover.jpg' }} />)

    const input = screen.getByPlaceholderText('在文中搜索...')
    fireEvent.change(input, { target: { value: 'hello 世界' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockRouterPush).toHaveBeenCalledWith(
      {
        pathname: '/[prefix]/[slug]',
        query: {
          prefix: 'zh-CN',
          slug: 'article/demo',
          existing: '1',
          keyword: 'hello 世界'
        }
      },
      undefined,
      { shallow: true }
    )
  })
})
