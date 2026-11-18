import { render } from '@testing-library/react'
import Utterances from '@/components/Utterances'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key =>
    key === 'COMMENT_UTTERRANCES_REPO' ? 'owner/comments' : null
  )
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ isDarkMode: false })
}))

describe('Utterances', () => {
  it('recreates the widget for the current article issue term', () => {
    const { container, rerender } = render(<Utterances issueTerm='post-a' />)

    expect(
      container.querySelector('script[src="https://utteranc.es/client.js"]')
    ).toHaveAttribute('issue-term', 'post-a')

    const frame = document.createElement('iframe')
    frame.className = 'utterances-frame'
    container.querySelector('#comments').appendChild(frame)

    rerender(<Utterances issueTerm='post-b' />)

    const scripts = container.querySelectorAll(
      'script[src="https://utteranc.es/client.js"]'
    )
    expect(scripts).toHaveLength(1)
    expect(scripts[0]).toHaveAttribute('issue-term', 'post-b')
    expect(container.querySelector('.utterances-frame')).not.toBeInTheDocument()
  })
})
