import { render } from '@testing-library/react'
import BlogPostCard from '@/themes/heo/components/BlogPostCard'
import CONFIG from '@/themes/heo/config'

const mockThemeConfig = {
  HEO_POST_LIST_PREVIEW: false,
  HEO_POST_LIST_COVER_DEFAULT: true,
  HEO_POST_LIST_COVER: true,
  HEO_HOME_POST_TWO_COLS: false,
  HEO_POST_LIST_COVER_HOVER_ENLARGE: true,
  HEO_POST_LIST_IMG_CROSSOVER: false,
  POST_TITLE_ICON: false
}

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => mockThemeConfig[key] ?? false)
}))

jest.mock('@/components/LazyImage', () => {
  return function LazyImage({ priority, ...props }) {
    return (
      <img
        alt={props.alt || 'cover'}
        data-priority={priority ? 'high' : 'normal'}
        {...props}
      />
    )
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

  beforeEach(() => {
    mockThemeConfig.HEO_POST_LIST_COVER_HOVER_ENLARGE = true
    mockThemeConfig.HEO_POST_LIST_IMG_CROSSOVER = false
  })

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

  it('keeps cover crossover disabled in the HEO theme defaults', () => {
    expect(CONFIG.HEO_POST_LIST_IMG_CROSSOVER).toBe(false)
  })

  it('does not mutate a post when BlogPostCard uses the site default cover', () => {
    const post = createPost()

    render(<BlogPostCard index={0} post={post} siteInfo={siteInfo} />)

    expect(post.pageCoverThumbnail).toBeUndefined()
  })

  it('uses the aspect-ratio driven cover layout by default', () => {
    const post = {
      ...createPost(),
      pageCoverThumbnail: '/post-cover.jpg'
    }

    const { getByAltText } = render(
      <BlogPostCard index={0} post={post} siteInfo={siteInfo} />
    )

    const coverWrapper = getByAltText('Post title').parentElement

    // 所有断点均由 style.js 中 .heo-post-cover-card 的 aspect-ratio
    // 保留稳定高度；桌面端只负责在文字较高时垂直居中。
    expect(coverWrapper).toHaveClass('heo-post-cover-card')
    expect(coverWrapper).toHaveClass('flex-none')
    expect(coverWrapper).toHaveClass('md:self-center')
    expect(coverWrapper).not.toHaveClass('md:h-full')
  })

  it('describes the actual mobile card width to responsive images', () => {
    const post = {
      ...createPost(),
      pageCoverThumbnail: '/post-cover.jpg'
    }

    const { getByAltText } = render(
      <BlogPostCard index={0} post={post} siteInfo={siteInfo} />
    )

    expect(getByAltText('Post title')).toHaveAttribute(
      'sizes',
      '(min-width: 720px) 42vw, calc(100vw - 2.5rem)'
    )
  })

  it('loads the first two covers eagerly; only the first is high priority', () => {
    // 首屏前两张卡片封面立即并行加载（loading=eager，浏览器原生调度），
    // 但只有第 0 张走 fetchpriority=high，避免抢占 LCP 的优先级。
    const firstPost = {
      ...createPost(),
      pageCoverThumbnail: '/first-cover.jpg'
    }
    const secondPost = {
      ...createPost(),
      id: 'post-2',
      title: 'Second post',
      href: '/article/second-post',
      pageCoverThumbnail: '/second-cover.jpg'
    }

    const { getByAltText, rerender } = render(
      <BlogPostCard index={0} post={firstPost} siteInfo={siteInfo} />
    )

    expect(getByAltText('Post title')).toHaveAttribute('data-priority', 'high')
    expect(getByAltText('Post title')).toHaveAttribute('loading', 'eager')

    rerender(<BlogPostCard index={1} post={secondPost} siteInfo={siteInfo} />)

    expect(getByAltText('Second post')).toHaveAttribute(
      'data-priority',
      'normal'
    )
    // 第二张卡片封面也在首屏内，立即并行加载，但不是高优先级
    expect(getByAltText('Second post')).toHaveAttribute('loading', 'eager')
  })

  it('allows the homepage hero to own the high-priority image', () => {
    const post = {
      ...createPost(),
      pageCoverThumbnail: '/post-cover.jpg'
    }

    const { getByAltText } = render(
      <BlogPostCard
        index={0}
        post={post}
        siteInfo={siteInfo}
        prioritizeCover={false}
      />
    )

    expect(getByAltText('Post title')).toHaveAttribute(
      'data-priority',
      'normal'
    )
  })

  it('applies cover sizing to the direct flex item', () => {
    const post = {
      ...createPost(),
      pageCoverThumbnail: '/post-cover.jpg'
    }

    const { container, getByAltText } = render(
      <BlogPostCard index={0} post={post} siteInfo={siteInfo} />
    )

    const card = container.querySelector('[data-wow-delay]')
    const coverLink = getByAltText('Post title').closest('a')

    expect(coverLink).toHaveClass('w-full')
    expect(coverLink).toHaveClass('md:w-5/12')
    expect(coverLink?.parentElement).toBe(card)
  })

  it('uses the full content width when no cover can be resolved', () => {
    const { getByText } = render(
      <BlogPostCard index={0} post={createPost()} siteInfo={{}} />
    )

    const content = getByText('Post title').closest('div.flex-col')

    expect(content).toHaveClass('w-full')
    expect(content).not.toHaveClass('md:w-7/12')
  })

  it('keeps odd post card covers on the left by default', () => {
    const post = {
      ...createPost(),
      pageCoverThumbnail: '/post-cover.jpg'
    }

    const { container } = render(
      <BlogPostCard index={1} post={post} siteInfo={siteInfo} />
    )

    expect(container.querySelector('[data-wow-delay]')).not.toHaveClass(
      'md:flex-row-reverse'
    )
  })

  it('reverses odd post cards when cover crossover is explicitly enabled', () => {
    mockThemeConfig.HEO_POST_LIST_IMG_CROSSOVER = true
    const post = {
      ...createPost(),
      pageCoverThumbnail: '/post-cover.jpg'
    }

    const { container } = render(
      <BlogPostCard index={1} post={post} siteInfo={siteInfo} />
    )

    expect(container.querySelector('[data-wow-delay]')).toHaveClass(
      'md:flex-row-reverse'
    )
  })

  it('does not enlarge the cover when hover enlargement is disabled', () => {
    mockThemeConfig.HEO_POST_LIST_COVER_HOVER_ENLARGE = false
    const post = {
      ...createPost(),
      pageCoverThumbnail: '/post-cover.jpg'
    }

    const { getByAltText } = render(
      <BlogPostCard index={0} post={post} siteInfo={siteInfo} />
    )

    expect(getByAltText('Post title')).not.toHaveClass('group-hover:scale-105')
  })
})
