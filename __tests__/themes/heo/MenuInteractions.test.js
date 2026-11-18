import { act, fireEvent, render, screen } from '@testing-library/react'
import { MenuItemCollapse } from '@/themes/heo/components/MenuItemCollapse'
import { MenuItemDrop } from '@/themes/heo/components/MenuItemDrop'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) => defaultValue)
}))

jest.mock('@/components/SmartLink', () => {
  return function MockSmartLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

jest.mock('@/components/Collapse', () => {
  return function MockCollapse({ children }) {
    return <div>{children}</div>
  }
})

const nestedLink = {
  name: 'Documentation',
  show: true,
  subMenus: [
    { name: 'Getting started', href: '/docs/start', show: true },
    { name: 'Hidden draft', href: '/docs/draft', show: false }
  ]
}

describe('HEO menu keyboard and submenu behavior', () => {
  it('closes a desktop submenu from a focused menu item with Escape', () => {
    render(<MenuItemDrop link={nestedLink} />)

    const trigger = screen.getByRole('button', { name: 'Documentation' })
    fireEvent.click(trigger)
    const childLink = screen.getByRole('menuitem', {
      name: 'Getting started'
    })
    act(() => childLink.focus())
    fireEvent.keyDown(childLink, { key: 'Escape' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('uses the submenu name fallback and removes collapsed links from tab order', () => {
    const { container } = render(<MenuItemCollapse link={nestedLink} />)

    const trigger = screen.getByRole('button', { name: 'Documentation' })
    const childLink = container.querySelector('a[href="/docs/start"]')

    expect(childLink).toHaveTextContent('Getting started')
    expect(childLink).toHaveAttribute('tabindex', '-1')
    expect(screen.queryByText('Hidden draft')).not.toBeInTheDocument()

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('link', { name: 'Getting started' })
    ).toBe(childLink)
    expect(childLink).toHaveAttribute('tabindex', '0')
  })
})
