import { render, screen } from '@testing-library/react'
import SmartLink from '@/components/SmartLink'

const mockSiteConfig = jest.fn()

jest.mock('@/lib/config', () => ({
  siteConfig: (...args) => mockSiteConfig(...args)
}))

jest.mock('next/link', () => {
  return function MockLink({ href, prefetch, children, ...props }) {
    return (
      <a
        href={typeof href === 'string' ? href : href?.pathname}
        data-prefetch={String(prefetch)}
        {...props}>
        {children}
      </a>
    )
  }
})

describe('SmartLink prefetch policy', () => {
  beforeEach(() => {
    mockSiteConfig.mockImplementation((key, fallback) => {
      if (key === 'LINK') return 'https://example.com'
      return fallback
    })
  })

  it('disables viewport prefetch by default', () => {
    render(<SmartLink href='/article/test'>Article</SmartLink>)

    expect(screen.getByRole('link')).toHaveAttribute('data-prefetch', 'false')
  })

  it('allows callers to opt a high-value link into prefetching', () => {
    render(
      <SmartLink href='/article/test' prefetch>
        Article
      </SmartLink>
    )

    expect(screen.getByRole('link')).toHaveAttribute('data-prefetch', 'true')
  })

  it('honors the global prefetch switch', () => {
    mockSiteConfig.mockImplementation((key, fallback) => {
      if (key === 'LINK') return 'https://example.com'
      if (key === 'PREFETCH_LINKS') return true
      return fallback
    })

    render(<SmartLink href='/article/test'>Article</SmartLink>)

    expect(screen.getByRole('link')).toHaveAttribute('data-prefetch', 'true')
  })
})
