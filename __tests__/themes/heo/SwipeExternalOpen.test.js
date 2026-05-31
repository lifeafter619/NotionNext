import { fireEvent, render, screen } from '@testing-library/react'
import Swipe from '@/themes/heo/components/Swipe'

jest.mock('styled-jsx/style', () => () => null)

jest.mock('@/lib/utils', () => ({
  isBrowser: true
}))

describe('HEO Swipe external open', () => {
  beforeEach(() => {
    window.open = jest.fn()
  })

  it('uses noopener and noreferrer when opening swipe links', () => {
    render(
      <Swipe
        items={[{ title: 'External notice', url: 'https://example.com/post' }]}
      />
    )

    fireEvent.click(screen.getByText('External notice'))

    expect(window.open).toHaveBeenCalledWith(
      'https://example.com/post',
      '_blank',
      'noopener,noreferrer'
    )
  })
})
