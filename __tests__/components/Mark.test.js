import replaceSearchResult from '@/components/Mark'
import { loadExternalResource } from '@/lib/utils'

jest.mock('@/lib/utils', () => ({
  loadExternalResource: jest.fn(() => Promise.resolve())
}))

describe('replaceSearchResult', () => {
  beforeEach(() => {
    loadExternalResource.mockClear()
    document.body.innerHTML = '<article id="article">hello world</article>'
    window.Mark = class MockMark {
      constructor(container) {
        this.container = container
      }

      markRegExp(regex, options) {
        setTimeout(() => {
          this.container.innerHTML = this.container.textContent.replace(
            regex,
            match =>
              `<${options.element} class="${options.className}">${match}</${options.element}>`
          )
          options.done?.()
        }, 10)
      }
    }
  })

  afterEach(() => {
    delete window.Mark
    document.body.innerHTML = ''
  })

  it('waits until mark.js finishes inserting search highlights', async () => {
    const article = document.getElementById('article')

    await replaceSearchResult({
      doms: article,
      search: 'hello',
      target: {
        element: 'span',
        className: 'search-highlight'
      }
    })

    expect(document.querySelectorAll('.search-highlight')).toHaveLength(1)
  })

  it('uses a native highlighter when mark.js is unavailable', async () => {
    delete window.Mark
    loadExternalResource.mockRejectedValueOnce(new Error('blocked'))
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const article = document.getElementById('article')

    await replaceSearchResult({
      doms: article,
      search: 'hello',
      target: {
        element: 'span',
        className: 'search-highlight'
      }
    })

    expect(document.querySelectorAll('.search-highlight')).toHaveLength(1)
    expect(document.querySelector('.search-highlight')).toHaveTextContent(
      'hello'
    )
    warnSpy.mockRestore()
  })
})
