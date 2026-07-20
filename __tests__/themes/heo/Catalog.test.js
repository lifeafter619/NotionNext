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
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0
    })
    window.history.replaceState(null, '', '/')
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

  it('rebinds the scroll spy when the toc changes', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    const firstToc = [{ id: 'known', text: 'Known heading', indentLevel: 0 }]
    const secondToc = [{ id: 'next', text: 'Next heading', indentLevel: 0 }]

    const { rerender } = render(<Catalog forceSpy toc={firstToc} />)
    const firstScrollHandler = addEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === 'scroll'
    )?.[1]

    rerender(<Catalog forceSpy toc={secondToc} />)

    const scrollHandlers = addEventListenerSpy.mock.calls
      .filter(([eventName]) => eventName === 'scroll')
      .map(([, handler]) => handler)

    expect(scrollHandlers).toHaveLength(2)
    expect(scrollHandlers[1]).not.toBe(firstScrollHandler)
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      firstScrollHandler
    )
  })

  it('jumps a catalog item to its heading with the heo nav offset', async () => {
    window.scrollTo = jest.fn()
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 120
    })
    document.body.innerHTML =
      '<article id="notion-article"><h2 id="known" class="notion-h" data-id="known">Known heading</h2></article>'
    document.getElementById('known').getBoundingClientRect = () => ({
      top: 640,
      bottom: 700,
      left: 0,
      right: 320,
      width: 320,
      height: 60
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

    fireEvent.click(screen.getByRole('link', { name: 'Known heading' }))

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 680,
      behavior: 'smooth'
    })
    expect(window.location.hash).toBe('#known')

    fireEvent.click(screen.getByText('回到原位置'))
    await waitFor(() => {
      expect(screen.queryByText('回到原位置')).not.toBeInTheDocument()
    })
  })

  it('opens collapsed Notion toggle ancestors before measuring a catalog heading', () => {
    window.scrollTo = jest.fn()
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 120
    })
    document.body.innerHTML = `
      <article id="notion-article">
        <details class="notion-toggle">
          <summary>
            <h2 class="notion-h notion-h2" data-id="parent">
              <span><div id="parent" class="notion-header-anchor"></div></span>
            </h2>
          </summary>
          <div>
            <h3 class="notion-h notion-h3" data-id="child">
              <span><div id="child" class="notion-header-anchor"></div></span>
            </h3>
          </div>
        </details>
      </article>
    `
    const details = document.querySelector('details')
    const heading = document.querySelector('[data-id="child"]')
    heading.getBoundingClientRect = () => ({
      top: details.open ? 640 : 0,
      bottom: details.open ? 700 : 0,
      left: 0,
      right: 320,
      width: 320,
      height: details.open ? 60 : 0
    })

    render(
      <Catalog
        forceSpy
        toc={[
          {
            id: 'child',
            text: 'Child heading',
            indentLevel: 1
          }
        ]}
      />
    )

    fireEvent.click(screen.getByRole('link', { name: 'Child heading' }))
    fireEvent.click(screen.getAllByRole('button')[1])

    expect(details.open).toBe(true)
    expect(window.scrollTo).toHaveBeenNthCalledWith(1, {
      top: 680,
      behavior: 'smooth'
    })
    expect(window.location.hash).toBe('#child')
  })

  it('uses the visible heo comment wrapper while the inner comment is hidden', async () => {
    window.scrollTo = jest.fn()
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="post-comments"><div id="comment">Comments</div></div>'
    )
    document.getElementById('post-comments').getBoundingClientRect = () => ({
      top: 640,
      bottom: 760,
      left: 0,
      right: 320,
      width: 320,
      height: 120
    })
    document.getElementById('comment').getBoundingClientRect = () => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0
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

  it('stretches the comment jump button across the catalog width', () => {
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

    expect(screen.getByRole('button', { name: '跳转到评论区' })).toHaveClass(
      'w-full'
    )
  })
})
