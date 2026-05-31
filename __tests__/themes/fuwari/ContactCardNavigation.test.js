import { fireEvent, render, screen } from '@testing-library/react'
import ContactCard from '@/themes/fuwari/components/ContactCard'

const mockRouterPush = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  })
}))

jest.mock('@/components/FlipCard', () => {
  return function FlipCard({ frontContent, backContent }) {
    return (
      <div>
        {frontContent}
        {backContent}
      </div>
    )
  }
})

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    const config = {
      FUWARI_WIDGET_CONTACT: true,
      FUWARI_CONTACT_TITLE: 'Contact',
      FUWARI_CONTACT_DESCRIPTION: 'Open contact page',
      FUWARI_CONTACT_URL: '/contact',
      FUWARI_CONTACT_TEXT: 'Open',
      FUWARI_CONTACT_FLIP_CARD: false,
      FUWARI_CONTACT_FRONT_BADGE: '',
      FUWARI_CONTACT_BACK_TITLE: 'Back',
      FUWARI_CONTACT_BACK_DESCRIPTION: 'Back description',
      FUWARI_CONTACT_BACK_TEXT: 'Back open'
    }
    return config[key] ?? fallback
  })
}))

describe('Fuwari ContactCard navigation', () => {
  beforeEach(() => {
    mockRouterPush.mockClear()
  })

  it('uses client-side navigation for internal contact links', () => {
    render(<ContactCard />)

    fireEvent.click(screen.getByRole('link'))

    expect(mockRouterPush).toHaveBeenCalledWith('/contact')
  })
})
