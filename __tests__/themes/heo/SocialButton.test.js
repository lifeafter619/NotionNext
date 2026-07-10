import { render, screen } from '@testing-library/react'
import SocialButton from '@/themes/heo/components/SocialButton'

const mockSiteConfig = jest.fn()

jest.mock('@/lib/config', () => ({
  siteConfig: key => mockSiteConfig(key)
}))

describe('HEO SocialButton', () => {
  beforeEach(() => {
    const config = {
      CONTACT_GITHUB: 'https://github.com/notion-next',
      CONTACT_EMAIL: 'hello@example.com'
    }
    mockSiteConfig.mockImplementation(key => config[key] || false)
  })

  it('wraps the actual social controls with bounded responsive gaps', () => {
    render(<SocialButton />)

    const controls = screen.getByTitle('email').closest('div')

    expect(controls).toHaveClass('flex')
    expect(controls).toHaveClass('flex-wrap')
    expect(controls).toHaveClass('justify-center')
    expect(controls).toHaveClass('gap-x-6')
    expect(controls).toHaveClass('gap-y-4')
    expect(controls).toHaveClass('sm:gap-x-12')
    expect(controls).not.toHaveClass('space-x-12')
  })

  it('renders email as a valid mailto link', () => {
    render(<SocialButton />)

    expect(screen.getByTitle('email')).toHaveAttribute(
      'href',
      'mailto:hello@example.com'
    )
  })

  it('does not render anchors for entries without a target', () => {
    mockSiteConfig.mockReturnValue(false)

    render(<SocialButton />)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(document.querySelectorAll('a:not([href])')).toHaveLength(0)
  })
})
