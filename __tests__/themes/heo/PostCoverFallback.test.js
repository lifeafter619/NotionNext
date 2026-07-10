import { render } from '@testing-library/react'
import BlogPostArchive from '@/themes/heo/components/BlogPostArchive'
import BlogPostCard from '@/themes/heo/components/BlogPostCard'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      HEO_POST_LIST_PREVIEW: false,
      HEO_POST_LIST_COVER_DEFAULT: true,
      HEO_POST_LIST_COVER: true,
      HEO_HOME_POST_TWO_COLS: false,
      HEO_POST_LIST_COVER_HOVER_ENLARGE: true,
      POST_TITLE_ICON: false
    }
    return config[key] ?? false
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

jest.mock('@/components/HeroIcons', () => ({
  HashTag: () => null
}))

jest.mock('@/themes/heo/components/NotionIcon', () => () => null)

describe('heo post cover fallback', () => {
  const siteInfo = { pageCover: '/site-cover.jpg' }

  function createPost() {
    return {
      id: 'post-1',
      title: 'Post title',
      href: '/article/post-title',
      category: 'Tech',
      summary: 'Summary',
      tagItems: []
    }
  }

  it('does not mutate a post when BlogPostCard uses the site default cover', () => {
    const post = createPost()

    render(<BlogPostCard index={0} post={post} siteInfo={siteInfo} />)

    expect(post.pageCoverThumbnail).toBeUndefined()
  })

  it('uses the card flex space for the default mobile cover layout', () => {
    const post = {
      ...createPost(),
      pageCoverThumbnail: '/post-cover.jpg'
    }

    const { getByAltText } = render(
      <BlogPostCard index={0} post={post} siteInfo={siteInfo} />
    )

    const coverWrapper = getByAltText('Post title').parentElement

    expect(coverWrapper).toHaveClass('flex-1')
    expect(coverWrapper).toHaveClass('min-h-0')
    expect(coverWrapper).toHaveClass('md:flex-none')
  })

  it('uses the full content width when no cover can be resolved', () => {
    const { getByText } = render(
      <BlogPostCard index={0} post={createPost()} siteInfo={{}} />
    )

    const content = getByText('Post title').closest('div.flex-col')

    expect(content).toHaveClass('w-full')
    expect(content).not.toHaveClass('md:w-7/12')
  })

  it('does not mutate a post when BlogPostArchive uses the site default cover', () => {
    const post = createPost()

    render(
      <BlogPostArchive archiveTitle='2026' posts={[post]} siteInfo={siteInfo} />
    )

    expect(post.pageCoverThumbnail).toBeUndefined()
  })
})
