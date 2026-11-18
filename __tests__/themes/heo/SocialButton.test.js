import { fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server.node'
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

  it('creates a valid mailto link for a plain-text email after activation', () => {
    render(<SocialButton />)

    const emailControl = screen.getByTitle('email')
    expect(emailControl).not.toHaveAttribute('href')

    fireEvent.keyDown(emailControl, { key: 'Enter' })

    expect(emailControl).toHaveAttribute('href', 'mailto:hello@example.com')
  })

  it('keeps an encoded email out of server-rendered HTML', () => {
    const protectedEmail = 'protected@example.com'
    mockSiteConfig.mockImplementation(key =>
      key === 'CONTACT_EMAIL' ? btoa(protectedEmail) : false
    )

    const markup = renderToString(<SocialButton />)

    expect(markup).not.toContain(protectedEmail)
    expect(markup).not.toContain('mailto:')
  })

  it('creates the mailto target only when the email control is activated', () => {
    const protectedEmail = 'protected@example.com'
    mockSiteConfig.mockImplementation(key =>
      key === 'CONTACT_EMAIL' ? btoa(protectedEmail) : false
    )

    render(<SocialButton />)

    const emailControl = screen.getByTitle('email')
    expect(emailControl).not.toHaveAttribute('href')

    fireEvent.keyDown(emailControl, { key: 'Enter' })

    expect(emailControl).toHaveAttribute('href', `mailto:${protectedEmail}`)
  })

  it('does not render anchors for entries without a target', () => {
    mockSiteConfig.mockReturnValue(false)

    render(<SocialButton />)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(document.querySelectorAll('a:not([href])')).toHaveLength(0)
  })
})
