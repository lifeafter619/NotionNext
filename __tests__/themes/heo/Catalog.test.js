import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Catalog from '@/themes/heo/components/Catalog'

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: {
        TABLE_OF_CONTENTS: 'Contents'
      }
    }
  })
}))

jest.mock('notion-utils', () => ({
  uuidToId: value => value
}))

describe('heo Catalog', () => {
  let scrollToMock

  beforeEach(() => {
    scrollToMock = jest.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollToMock
    })
    document.body.innerHTML =
      '<article id="notion-article"><h2 class="notion-h" data-id="missing">Missing heading</h2></article>'
  })

  it('keeps the catalog scroll target non-negative when the active heading is missing from toc', () => {
    render(
      <Catalog
        forceSpy
        toc={[
          {
            id: 'known',
            text: 'Known heading',
            indentLevel: 0
          }
        ]}
      />
    )

    expect(scrollToMock).toHaveBeenCalled()
    expect(scrollToMock.mock.calls[0][0].top).toBeGreaterThanOrEqual(0)
  })

  it('jumps to the heo comments wrapper from the catalog comment action', async () => {
    window.scrollTo = jest.fn()
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="post-comments">Comments</div>'
    )
    document.getElementById('post-comments').getBoundingClientRect = () => ({
      top: 640,
      bottom: 760,
      left: 0,
      right: 320,
      width: 320,
      height: 120
    })

    render(
      <Catalog
        forceSpy
        toc={[
          {
            id: 'known',
            text: 'Known heading',
            indentLevel: 0
          }
        ]}
      />
    )

    fireEvent.click(screen.getByText('跳转到评论区'))

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 560,
      behavior: 'smooth'
    })

    fireEvent.click(screen.getByText('回到原位置'))
    await waitFor(() => {
      expect(screen.queryByText('回到原位置')).not.toBeInTheDocument()
    })
  })
})
