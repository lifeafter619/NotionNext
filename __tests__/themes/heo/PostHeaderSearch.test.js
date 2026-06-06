/* eslint-disable @next/next/no-img-element */
import { act, fireEvent, render, screen } from '@testing-library/react'
import PostHeader from '@/themes/heo/components/PostHeader'

const mockRouterPush = jest.fn()
const mockSetOnLoading = jest.fn()

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
    setOnLoading: mockSetOnLoading,
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
    if (!props.src) return null
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
    mockSetOnLoading.mockClear()
    jest.useRealTimers()
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
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent')
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
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'notionnext:article-search',
        detail: { keyword: 'hello 世界' }
      })
    )
    dispatchEventSpy.mockRestore()
  })

  it('clears loading immediately when no article cover is available', () => {
    render(<PostHeader post={post} siteInfo={{}} />)

    expect(mockSetOnLoading).toHaveBeenCalledWith(false)
  })

  it('clears loading after a cover load safety timeout', () => {
    jest.useFakeTimers()

    render(<PostHeader post={post} siteInfo={{ pageCover: '/cover.jpg' }} />)

    expect(mockSetOnLoading).not.toHaveBeenCalled()

    jest.advanceTimersByTime(4000)

    expect(mockSetOnLoading).toHaveBeenCalledWith(false)
  })

  it('coalesces article font size updates into one animation frame', () => {
    let animationFrameCallback
    const requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        animationFrameCallback = callback
        return 1
      })
    const cancelAnimationFrameSpy = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})

    document.body.insertAdjacentHTML(
      'beforeend',
      '<article id="notion-article"><div class="notion">A</div><div class="notion">B</div></article>'
    )

    render(<PostHeader post={post} siteInfo={{ pageCover: '/cover.jpg' }} />)

    const article = document.getElementById('notion-article')
    const documentQuerySpy = jest.spyOn(document, 'querySelectorAll')
    const articleQuerySpy = jest.spyOn(article, 'querySelectorAll')
    const slider = screen.getByRole('slider')

    fireEvent.change(slider, { target: { value: '19' } })
    fireEvent.change(slider, { target: { value: '20' } })
    fireEvent.change(slider, { target: { value: '21' } })

    expect(documentQuerySpy).not.toHaveBeenCalled()
    expect(articleQuerySpy).not.toHaveBeenCalled()

    act(() => {
      animationFrameCallback()
    })

    expect(documentQuerySpy).not.toHaveBeenCalled()
    expect(articleQuerySpy).toHaveBeenCalledTimes(1)
    expect(article.style.fontSize).toBe('21px')
    expect(article.querySelector('.notion').style.fontSize).toBe('21px')

    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()
  })
})
