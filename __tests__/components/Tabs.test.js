import { render, screen } from '@testing-library/react'
import Tabs from '@/components/Tabs'

const mockSiteConfig = jest.fn()

jest.mock('@/lib/config', () => ({
  siteConfig: (...args) => mockSiteConfig(...args)
}))

describe('Tabs', () => {
  beforeEach(() => {
    mockSiteConfig.mockReset()
    mockSiteConfig.mockReturnValue(true)
  })

  it('ignores empty conditional children and hides a single remaining tab', () => {
    render(
      <Tabs>
        {''}
        {false}
        {null}
        <div key='Waline'>Waline comments</div>
        {undefined}
      </Tabs>
    )

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-label', 'Waline')
    expect(screen.getByText('Waline comments')).toBeVisible()
  })
})
