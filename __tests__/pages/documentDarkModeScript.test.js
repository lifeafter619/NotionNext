import MyDocument, { darkModeScript } from '@/pages/_document'
import { renderToStaticMarkup } from 'react-dom/server.node'

jest.mock('next/document', () => {
  const React = require('react')
  class Document extends React.Component {}
  return {
    __esModule: true,
    default: Document,
    Html: ({ children, ...props }) =>
      React.createElement('html', props, children),
    Head: ({ children }) => React.createElement('head', null, children),
    Main: () => React.createElement('main'),
    NextScript: () => React.createElement('script')
  }
})

describe('document dark mode bootstrap script', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    document.documentElement.className = ''
  })

  it('applies a theme class even when localStorage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(() => {
      eval(darkModeScript)
    }).not.toThrow()
    expect(document.documentElement.classList.length).toBeGreaterThan(0)
  })

  it('applies no-referrer before any image resources are loaded', () => {
    const markup = renderToStaticMarkup(new MyDocument().render())

    expect(markup).toContain('<meta name="referrer" content="no-referrer"/>')
  })
})
