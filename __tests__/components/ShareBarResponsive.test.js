import { render, screen } from '@testing-library/react'
import ShareBar from '@/components/ShareBar'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      POST_SHARE_BAR_ENABLE: 'true'
    }
    return config[key] ?? ''
  })
}))

jest.mock('next/dynamic', () => () => {
  function DynamicShareButtons() {
    return <div data-testid='share-buttons'>share buttons</div>
  }
  return DynamicShareButtons
})

describe('ShareBar responsive layout', () => {
  it('wraps share buttons instead of forcing horizontal overflow', () => {
    const { container } = render(
      <ShareBar
        post={{
          title: 'Post',
          type: 'Post'
        }}
      />
    )

    const shareButtons = screen.getByTestId('share-buttons')
    const buttonRow = shareButtons.parentElement
    const scrollContainer = container.firstElementChild

    expect(buttonRow).toHaveClass('flex-wrap')
    expect(buttonRow).toHaveClass('gap-y-2')
    expect(scrollContainer).not.toHaveClass('overflow-x-auto')
  })
})
