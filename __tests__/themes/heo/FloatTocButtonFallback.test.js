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
  const defaultMatchMedia = window.matchMedia

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
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      writable: true,
      value: 1
    })
    Object.defineProperty(window, 'screen', {
      configurable: true,
      writable: true,
      value: {
        width: 390,
        height: 844
      }
    })
    window.matchMedia = defaultMatchMedia
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

  it('unmounts mobile floating action buttons while the toc drawer is open', async () => {
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
      expect(document.getElementById('toc-button')).toBeInTheDocument()
    })

    fireEvent.click(document.getElementById('toc-button'))

    await waitFor(() => {
      expect(document.getElementById('toc-drawer')).toBeInTheDocument()
    })
    expect(document.getElementById('toc-button')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('跳转评论')).not.toBeInTheDocument()
  })

  it('stacks the mobile toc and comment buttons in one fixed control group', async () => {
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
      expect(document.getElementById('toc-button')).toBeInTheDocument()
    })

    const tocButton = document.getElementById('toc-button')
    const commentButton = screen.getByLabelText('跳转评论')
    const tocFixedGroup = tocButton.closest('.fixed')
    const commentFixedGroup = commentButton.closest('.fixed')

    expect(tocFixedGroup).toBe(commentFixedGroup)
    expect(tocFixedGroup).toHaveClass('flex')
    expect(tocFixedGroup).toHaveClass('flex-col')
    expect(tocFixedGroup).toHaveClass('gap-3')
  })

  it('jumps the mobile comment button to the heo comment anchor', async () => {
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
      top: 720,
      bottom: 840,
      left: 0,
      right: 320,
      width: 320,
      height: 120
    })

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
      expect(screen.getByLabelText('跳转评论')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('跳转评论'))

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 640,
      behavior: 'smooth'
    })

    fireEvent.click(screen.getByText('回到原位置'))
    await waitFor(() => {
      expect(screen.queryByText('回到原位置')).not.toBeInTheDocument()
    })
  })

  it('jumps the desktop comment button to the heo comment anchor', async () => {
    window.innerWidth = 1440
    window.scrollTo = jest.fn()
    document.body.insertAdjacentHTML(
      'beforeend',
      '<aside id="sideRight"><div id="sideRightSticky"><div id="sideRightCatalog"></div></div></aside><div id="post-comments"><div id="comment">Comments</div></div>'
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
      top: 720,
      bottom: 840,
      left: 0,
      right: 320,
      width: 320,
      height: 120
    })
    window.IntersectionObserver = jest.fn(callback => ({
      observe: jest.fn(() => {
        callback([
          {
            isIntersecting: false,
            boundingClientRect: {
              top: -620,
              bottom: 40
            }
          }
        ])
      }),
      disconnect: jest.fn()
    }))

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
      expect(document.getElementById('float-toc-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('跳转评论'))

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 640,
      behavior: 'smooth'
    })

    fireEvent.click(screen.getByText('回到原位置'))
    await waitFor(() => {
      expect(screen.queryByText('回到原位置')).not.toBeInTheDocument()
    })
  })

  it('opens the mobile toc drawer at a larger default height', async () => {
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
      expect(document.getElementById('toc-button')).toBeInTheDocument()
    })

    fireEvent.click(document.getElementById('toc-button'))

    await waitFor(() => {
      expect(document.getElementById('toc-drawer')).toHaveStyle({
        height: '58vh'
      })
    })
  })

  it('keeps a floating toc entry available on desktop width', async () => {
    window.innerWidth = 1440
    document.body.insertAdjacentHTML(
      'beforeend',
      '<aside id="sideRight"></aside>'
    )

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
      const tocButtonWrapper =
        document.querySelector('#toc-button')?.parentElement
      const desktopToc = document.getElementById('float-toc-button')
      expect(
        Boolean(desktopToc) ||
          !tocButtonWrapper?.parentElement?.className.includes('xl:hidden')
      ).toBe(true)
    })
  })

  it('does not show the desktop floating toc while the sidebar catalog is visible', async () => {
    window.innerWidth = 1440
    document.body.insertAdjacentHTML(
      'beforeend',
      '<aside id="sideRight"><div id="sideRightSticky"><div id="sideRightCatalog"></div><div id="sideRightLatest"></div></div></aside>'
    )
    window.IntersectionObserver = jest.fn(callback => ({
      observe: jest.fn(element => {
        callback([
          {
            isIntersecting: element.id === 'sideRightSticky',
            boundingClientRect: {
              top: element.id === 'sideRightSticky' ? 120 : -120,
              bottom: element.id === 'sideRightSticky' ? 720 : -80
            }
          }
        ])
      }),
      disconnect: jest.fn()
    }))

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
      expect(window.IntersectionObserver).toHaveBeenCalled()
    })

    expect(document.getElementById('float-toc-button')).not.toBeInTheDocument()
  })

  it('does not show the desktop floating toc while later sidebar blocks are still visible', async () => {
    window.innerWidth = 1440
    document.body.insertAdjacentHTML(
      'beforeend',
      '<aside id="sideRight"><div id="sideRightSticky"><div id="sideRightCatalog"></div><div id="sideRightLatest"></div></div></aside>'
    )
    window.IntersectionObserver = jest.fn(callback => ({
      observe: jest.fn(element => {
        callback([
          {
            isIntersecting: false,
            boundingClientRect: {
              top: -240,
              bottom: 320
            }
          }
        ])
      }),
      disconnect: jest.fn()
    }))

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
      expect(window.IntersectionObserver).toHaveBeenCalled()
    })

    expect(document.getElementById('float-toc-button')).not.toBeInTheDocument()
  })

  it('shows the desktop floating toc when the whole sidebar area is above the viewport', async () => {
    window.innerWidth = 1440
    document.body.insertAdjacentHTML(
      'beforeend',
      '<aside id="sideRight"><div id="sideRightSticky"><div id="sideRightCatalog"></div><div id="sideRightLatest"></div></div></aside>'
    )
    window.IntersectionObserver = jest.fn(callback => ({
      observe: jest.fn(() => {
        callback([
          {
            isIntersecting: false,
            boundingClientRect: {
              top: -620,
              bottom: 40
            }
          }
        ])
      }),
      disconnect: jest.fn()
    }))

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
      expect(document.getElementById('float-toc-button')).toBeInTheDocument()
    })
  })

  it('waits for the desktop sidebar catalog before showing a fallback floating toc', async () => {
    window.innerWidth = 1440

    render(
      <FloatTocButton
        post={{
          title: 'Demo article',
          toc: [{ id: 'heading-one', text: 'Heading One', indentLevel: 0 }]
        }}
        lock={false}
      />
    )

    await new Promise(resolve => setTimeout(resolve, 25))

    expect(document.getElementById('float-toc-button')).not.toBeInTheDocument()
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
    document.body.insertAdjacentHTML(
      'beforeend',
      '<aside id="sideRight"></aside>'
    )

    render(<FloatTocButton post={{ title: 'Demo article' }} lock={false} />)

    expect(window.MutationObserver).not.toHaveBeenCalled()
  })

  it('uses the desktop floating toc at high browser zoom on desktop screens', async () => {
    window.innerWidth = 960
    window.innerHeight = 900
    window.devicePixelRatio = 2
    Object.defineProperty(window, 'screen', {
      configurable: true,
      writable: true,
      value: {
        width: 1920,
        height: 1080
      }
    })
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches:
        query.includes('hover: hover') || query.includes('pointer: fine'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))

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
      expect(document.getElementById('float-toc-button')).toBeInTheDocument()
    })

    expect(document.getElementById('toc-button')).not.toBeInTheDocument()
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
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mouseup',
      mouseUpHandler
    )
  })
})
