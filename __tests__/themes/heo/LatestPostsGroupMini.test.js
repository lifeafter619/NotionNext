import { render, screen } from '@testing-library/react'
import LatestPostsGroupMini from '@/themes/heo/components/LatestPostsGroupMini'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      SUB_PATH: '',
      IMAGE_COMPRESS_WIDTH: 1080,
      IMG_LAZY_LOAD_PLACEHOLDER: '/placeholder.svg',
      WEBP_SUPPORT: false,
      AVIF_SUPPORT: false,
      LINK: 'https://example.com'
    }
    return config[key]
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: {
        LATEST_POSTS: 'Latest posts'
      }
    }
  })
}))

jest.mock('@/components/LazyImage', () => {
  return function LazyImage(props) {
    return <img alt={props.alt || 'cover'} {...props} />
  }
})

jest.mock('@/components/SmartLink', () => {
  return function SmartLink({
    href,
    children,
    passHref: _passHref,
    legacyBehavior: _legacyBehavior,
    ...props
  }) {
    return (
      <a href={typeof href === 'string' ? href : href?.pathname} {...props}>
        {children}
      </a>
    )
  }
})

describe('heo LatestPostsGroupMini', () => {
  it('uses the post cover when the thumbnail cover is missing', () => {
    render(
      <LatestPostsGroupMini
        siteInfo={{ pageCover: '/site-cover.jpg' }}
        latestPosts={[
          {
            id: 'post-1',
            title: 'Post with cover',
            href: '/article/post-with-cover',
            slug: 'post-with-cover',
            pageCover: '/article-cover.jpg',
            lastEditedDay: '2026-07-03'
          }
        ]}
      />
    )

    expect(screen.getByAltText('cover')).toHaveAttribute(
      'src',
      '/article-cover.jpg'
    )
  })

  it('uses stable keys when latest post data has no id', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(
      <LatestPostsGroupMini
        siteInfo={{ pageCover: '/site-cover.jpg' }}
        latestPosts={[
          {
            title: 'First post',
            href: '/article/first-post',
            slug: 'first-post',
            lastEditedDay: '2026-07-01'
          },
          {
            title: 'Second post',
            href: '/article/second-post',
            slug: 'second-post',
            lastEditedDay: '2026-07-02'
          }
        ]}
      />
    )

    const keyWarnings = consoleErrorSpy.mock.calls.filter(call =>
      String(call[0]).includes('Each child in a list should have a unique "key"')
    )
    expect(keyWarnings).toHaveLength(0)
  })
})
