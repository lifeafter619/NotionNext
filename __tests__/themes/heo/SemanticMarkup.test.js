import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

const mockConfig = {}
const mockRouterPush = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/article/[slug]',
    pathname: '/article/[slug]',
    asPath: '/article/demo',
    query: { slug: 'demo' },
    locale: 'zh-CN',
    push: mockRouterPush,
    events: {
      on: jest.fn(),
      off: jest.fn()
    }
  })
}))

jest.mock('next/link', () => {
  const React = require('react')

  return function MockNextLink({
    href,
    children,
    legacyBehavior,
    passHref,
    ...props
  }) {
    const normalizedHref =
      typeof href === 'string' ? href : href?.pathname || '/'

    if (legacyBehavior && React.isValidElement(children)) {
      return React.cloneElement(
        children,
        passHref ? { href: normalizedHref } : undefined
      )
    }

    return (
      <a href={normalizedHref} {...props}>
        {children}
      </a>
    )
  }
})

jest.mock('next/dynamic', () => {
  const React = require('react')

  return loader => {
    const source = loader.toString()

    function DynamicComponent(props) {
      if (source.includes('NotionPage')) {
        return React.createElement(
          'div',
          { id: props.contentId || 'notion-article' },
          'Notion body'
        )
      }
      if (source.includes('@headlessui/react')) {
        return props.show === false ? null : React.createElement(
          React.Fragment,
          null,
          props.children
        )
      }
      return null
    }

    DynamicComponent.displayName = 'LoadableComponent'
    DynamicComponent.preload = jest.fn()
    return DynamicComponent
  }
})

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) =>
    Object.prototype.hasOwnProperty.call(mockConfig, key)
      ? mockConfig[key]
      : defaultValue
  )
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    fullWidth: true,
    isDarkMode: false,
    onLoading: false,
    locale: {
      COMMON: {
        COMMENTS: 'Comments',
        CATEGORY: 'Category',
        TAGS: 'Tags'
      },
      NAV: {
        ARCHIVE: 'Archive',
        SEARCH: 'Search',
        PAGE_NOT_FOUND: 'Not found'
      }
    }
  })
}))

jest.mock('@/lib/utils', () => ({
  isBrowser: true,
  isHttpLink: value => /^https?:\/\//i.test(value)
}))

jest.mock('@/lib/db/notion/cleanBlockMapForClient', () => ({
  blockMapHasCode: jest.fn(() => false)
}))
jest.mock('@/lib/plugins/algoliaConfig', () => ({
  isAlgoliaSearchEnabled: jest.fn(() => false)
}))
jest.mock('@/lib/plugins/wow', () => ({ loadWowJS: jest.fn() }))

jest.mock('@/components/HeroIcons', () => ({
  Home: props => <svg aria-hidden='true' {...props} />
}))
jest.mock('@/components/LazyImage', () => {
  return function MockLazyImage({ alt }) {
    return <span role='img' aria-label={alt} />
  }
})
jest.mock('@/components/LoadingCover', () => () => null)
jest.mock('@/components/Mark', () => jest.fn())
jest.mock('@/components/SearchHighlightNav', () => () => null)
jest.mock('@/components/ArticleExpirationNotice', () => () => null)

jest.mock('@/themes/heo/components/BlogPostArchive', () => () => null)
jest.mock('@/themes/heo/components/BlogPostListPage', () => () => null)
jest.mock('@/themes/heo/components/BlogPostListScroll', () => () => null)
jest.mock('@/themes/heo/components/CategoryBar', () => () => null)
jest.mock('@/themes/heo/components/FloatTocButton', () => () => null)
jest.mock('@/themes/heo/components/Footer', () => () => null)
jest.mock('@/themes/heo/components/Header', () => () => null)
jest.mock('@/themes/heo/components/Hero', () => () => null)
jest.mock('@/themes/heo/components/LatestPostsGroup', () => () => null)
jest.mock('@/themes/heo/components/NoticeBar', () => ({ NoticeBar: () => null }))
jest.mock('@/themes/heo/components/PostHeader', () => () => null)
jest.mock('@/themes/heo/components/PostLock', () => ({ PostLock: () => null }))
jest.mock('@/themes/heo/components/SearchNav', () => () => null)
jest.mock('@/themes/heo/style', () => ({ Style: () => null }))

const Logo = require('@/themes/heo/components/Logo').default
const Announcement = require('@/themes/heo/components/Announcement').default
const SEO = require('@/components/SEO').default
const { Layout404, LayoutSlug } = require('@/themes/heo')

describe('HEO semantic markup', () => {
  const post = {
    id: 'post-1',
    type: 'Post',
    title: 'Demo article',
    summary: 'Demo summary',
    slug: 'article/demo',
    category: 'Tech',
    tags: ['HEO'],
    publishDate: '2026-07-10',
    blockMap: { block: {} }
  }
  const siteInfo = {
    title: 'Test Site',
    description: 'Test description',
    icon: '/icon.png',
    pageCover: '/cover.jpg',
    link: 'https://site.example'
  }

  beforeEach(() => {
    Object.keys(mockConfig).forEach(key => delete mockConfig[key])
    Object.assign(mockConfig, {
      LINK: 'https://site.example',
      PATH: '',
      SUB_PATH: '',
      TITLE: 'Test Site',
      AUTHOR: 'Test Author',
      LANG: 'zh-CN',
      FONT_URL: [],
      POST_WAITING_TIME_FOR_404: 0
    })
  })

  it('renders the logo as one link-owned interactive surface', () => {
    const { container } = render(<Logo siteInfo={siteInfo} />)

    const link = screen.getByRole('link')
    expect(container.querySelectorAll('a')).toHaveLength(1)
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveClass(
      'flex',
      'flex-nowrap',
      'items-center',
      'cursor-pointer',
      'font-extrabold'
    )
    expect(link.querySelector('#logo-text')).toBeInTheDocument()
    expect(link.querySelector('a, button')).toBeNull()
  })

  it('uses the 404 home link itself as the button surface', () => {
    const { container } = render(<Layout404 />)

    const homeLink = screen.getByRole('link', { name: '回到主页' })
    expect(container.querySelector('a button')).toBeNull()
    expect(homeLink).toHaveClass(
      'bg-blue-500',
      'py-2',
      'px-4',
      'text-white'
    )
  })

  it('keeps NotionPage as the only canonical article ID in announcements', () => {
    const notionPageSource = fs.readFileSync(
      path.join(process.cwd(), 'components', 'NotionPage.js'),
      'utf8'
    )
    expect(notionPageSource).toMatch(
      /const NotionPage = \(\{ post, className, contentId = 'notion-article' \}\)/
    )
    expect(notionPageSource).toContain('id={contentId}')

    const notice = { ...post, id: 'notice-1', title: 'Notice' }
    const { container } = render(
      <>
        <LayoutSlug post={post} lock={false} validPassword={false} />
        <Announcement post={notice} />
      </>
    )
    expect(container.querySelector('#announcement-content')).toBeInTheDocument()
    expect(container.querySelectorAll('[id="notion-article"]')).toHaveLength(1)
    expect(container.querySelector('#heo-announcement')).toBeInTheDocument()
  })

  it('leaves BlogPosting ownership to SEO without article microdata', () => {
    const { container } = render(
      <>
        <SEO siteInfo={siteInfo} post={post} NOTION_CONFIG={{}} />
        <LayoutSlug post={post} lock={false} validPassword={false} />
      </>
    )

    const article = container.querySelector('#article-wrapper')
    expect(article).toBeInTheDocument()
    expect(article).not.toHaveAttribute('itemscope')
    expect(article).not.toHaveAttribute('itemtype')
    expect(
      container.querySelectorAll('[itemtype="https://schema.org/Movie"]')
    ).toHaveLength(0)

    const schemaTypes = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]')
    ).map(script => JSON.parse(script.textContent)['@type'])
    expect(schemaTypes).toEqual(['BlogPosting'])
  })
})
