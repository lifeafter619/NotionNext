import {
  bindNotionHashScrollHandler,
  scrollToNotionHeading
} from '@/lib/utils/notionHashScroll'

describe('notion hash scrolling', () => {
  beforeEach(() => {
    window.requestAnimationFrame = callback => {
      callback()
      return 1
    }
    window.history.pushState = jest.fn()
  })

  it('opens closed Notion toggle ancestors before scrolling to a nested heading', () => {
    document.body.innerHTML = `
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
    `
    const details = document.querySelector('details')
    const heading = document.querySelector('[data-id="child"]')
    heading.scrollIntoView = jest.fn()

    const didScroll = scrollToNotionHeading('child', {
      behavior: 'auto',
      updateHash: true
    })

    expect(didScroll).toBe(true)
    expect(details.open).toBe(true)
    expect(window.history.pushState).toHaveBeenCalledWith(null, '', '#child')
    expect(heading.scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'auto'
    })
  })

  it('intercepts same-page heading links and leaves unrelated anchors alone', () => {
    document.body.innerHTML = `
      <a id="toc-link" href="#target">Target</a>
      <a id="comment-link" href="#comment">Comment</a>
      <h2 class="notion-h notion-h2" data-id="target">
        <span><div id="target" class="notion-header-anchor"></div></span>
      </h2>
      <div id="comment"></div>
    `
    const heading = document.querySelector('[data-id="target"]')
    heading.scrollIntoView = jest.fn()
    const cleanup = bindNotionHashScrollHandler({
      behavior: 'auto'
    })

    document.getElementById('toc-link').dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      })
    )
    document.getElementById('comment-link').dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      })
    )

    expect(heading.scrollIntoView).toHaveBeenCalledTimes(1)
    expect(window.history.pushState).toHaveBeenCalledTimes(1)

    cleanup()
  })
})
