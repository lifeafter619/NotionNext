import { render } from '@testing-library/react'
import Live2DWaifu from '@/themes/next/components/Live2DWaifu'

jest.mock('@/lib/utils', () => ({
  loadExternalResource: jest.fn()
}))

describe('next Live2DWaifu', () => {
  it('renders the font-awesome stylesheet link without crashing', () => {
    Object.defineProperty(window.screen, 'width', {
      configurable: true,
      value: 320
    })

    const { container } = render(<Live2DWaifu />)

    expect(
      container.querySelector(
        'link[rel="stylesheet"][href="https://cdn.jsdelivr.net/npm/font-awesome/css/font-awesome.min.css"]'
      )
    ).toBeInTheDocument()
  })
})
