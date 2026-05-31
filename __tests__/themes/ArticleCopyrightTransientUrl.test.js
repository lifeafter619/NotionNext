import { render, screen, waitFor } from '@testing-library/react'
import HexoArticleCopyright from '@/themes/hexo/components/ArticleCopyright'
import MateryArticleCopyright from '@/themes/matery/components/ArticleCopyright'
import HeoPostCopyright from '@/themes/heo/components/PostCopyright'

jest.mock('@/components/SmartLink', () => {
  return function SmartLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

jest.mock('@/components/QrCode', () => {
  return function QrCode({ value }) {
    return <div data-testid='qr-code'>{value}</div>
  }
})

jest.mock('@/components/NotByAI', () => {
  return function NotByAI() {
    return <span>Not by AI</span>
  }
})

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: {
        AUTHOR: 'Author',
        URL: 'URL',
        COPYRIGHT: 'Copyright',
        COPYRIGHT_NOTICE: 'Notice'
      }
    }
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    const config = {
      LINK: 'https://blog.example.com',
      AUTHOR: 'Test Author',
      HEXO_ARTICLE_COPYRIGHT: true,
      MATERY_ARTICLE_COPYRIGHT: true,
      HEO_ARTICLE_COPYRIGHT: true,
      HEXO_ARTICLE_NOT_BY_AI: false,
      MATERY_ARTICLE_NOT_BY_AI: false,
      HEO_ARTICLE_NOT_BY_AI: false
    }
    return config[key] ?? fallback
  })
}))

const cases = [
  ['Hexo', HexoArticleCopyright],
  ['Matery', MateryArticleCopyright],
  ['HEO', HeoPostCopyright]
]

describe('article copyright transient URL cleanup', () => {
  beforeEach(() => {
    window.history.pushState(
      {},
      '',
      '/post/foo?giscus=abc&x=1&target=comment#intro'
    )
  })

  it.each(cases)(
    'shows the canonical URL in the %s copyright block',
    async (_name, Component) => {
      render(<Component post={{ copyright: 'Post copyright' }} />)

      await waitFor(() => {
        expect(
          screen.getByRole('link', {
            name: 'http://localhost/post/foo?x=1#intro'
          })
        ).toHaveAttribute('href', 'http://localhost/post/foo?x=1#intro')
      })
    }
  )
})
