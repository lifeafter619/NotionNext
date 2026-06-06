import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import FloatTocButton from '@/themes/heo/components/FloatTocButton'

jest.mock('notion-utils', () => ({
  uuidToId: id => id
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: {
        TABLE_OF_CONTENTS: '目录'
      }
    }
  })
}))

describe('heo FloatTocButton fallback toc', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 844
    })
    window.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      disconnect: jest.fn()
    }))
    window.MutationObserver = jest.fn(() => ({
      observe: jest.fn(),
      disconnect: jest.fn()
    }))
    HTMLElement.prototype.scrollTo = jest.fn()
    document.body.innerHTML = `
      <article id="notion-article">
        <h2 class="notion-h notion-h2" data-id="heading-one">Heading One</h2>
      </article>
    `
  })

  afterEach(() => {
    document.body.innerHTML = ''
    delete window.IntersectionObserver
    delete window.MutationObserver
  })

  it('shows the floating toc button from article headings when post.toc is missing', async () => {
    render(<FloatTocButton post={{ title: 'Demo article' }} lock={false} />)

    await waitFor(() => {
      expect(screen.getAllByText('目录导航').length).toBeGreaterThan(0)
    })
  })

  it('does not mount the drawer catalog until the toc drawer is opened', async () => {
    render(
      <FloatTocButton
        post={{
          title: 'Demo article',
          toc: [{ id: 'heading-one', text: 'Heading One', indentLevel: 0 }]
        }}
        lock={false}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByText('目录导航').length).toBeGreaterThan(0)
    })

    expect(document.querySelectorAll('.catalog-item')).toHaveLength(0)
  })

  it('keeps a floating toc entry available on desktop width', async () => {
    window.innerWidth = 1440
    document.body.insertAdjacentHTML('beforeend', '<aside id="sideRight"></aside>')

    render(
      <FloatTocButton
        post={{
          title: 'Demo article',
          toc: [{ id: 'heading-one', text: 'Heading One', indentLevel: 0 }]
        }}
        lock={false}
      />
    )

    await waitFor(() => {
      const tocButtonWrapper = document.querySelector('#toc-button')?.parentElement
      const desktopToc = document.getElementById('float-toc-button')
      expect(
        Boolean(desktopToc) ||
          !tocButtonWrapper?.parentElement?.className.includes('xl:hidden')
      ).toBe(true)
    })
  })

  it('does not observe article attribute churn when building fallback toc', async () => {
    render(<FloatTocButton post={{ title: 'Demo article' }} lock={false} />)

    await waitFor(() => {
      expect(window.MutationObserver).toHaveBeenCalled()
    })

    const observer = window.MutationObserver.mock.results[0].value
    expect(observer.observe).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.not.objectContaining({ attributes: true })
    )
  })

  it('does not build a duplicate fallback toc on desktop while the sidebar toc is present', () => {
    window.innerWidth = 1440
    document.body.insertAdjacentHTML('beforeend', '<aside id="sideRight"></aside>')

    render(<FloatTocButton post={{ title: 'Demo article' }} lock={false} />)

    expect(window.MutationObserver).not.toHaveBeenCalled()
  })

  it('cleans up desktop drag listeners when unmounted during a drag', async () => {
    window.innerWidth = 1440
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

    const { unmount } = render(
      <FloatTocButton
        post={{
          title: 'Demo article',
          toc: [{ id: 'heading-one', text: 'Heading One', indentLevel: 0 }]
        }}
        lock={false}
      />
    )

    await waitFor(() => {
      expect(document.getElementById('float-toc-button')).toBeInTheDocument()
    })

    fireEvent.mouseDown(
      document.getElementById('float-toc-button').firstElementChild,
      {
        clientX: 120,
        clientY: 160
      }
    )

    const mouseMoveHandler = addEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === 'mousemove'
    )?.[1]
    const mouseUpHandler = addEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === 'mouseup'
    )?.[1]

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mousemove',
      mouseMoveHandler
    )
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', mouseUpHandler)
  })
})
