import { act, render } from '@testing-library/react'
import PrismMac from '@/components/PrismMac'

let mockIsDarkMode = false
const mockLoadExternalResource = jest.fn(() => Promise.resolve())
const mockInitialize = jest.fn()
const mockRun = jest.fn(({ nodes }) => {
  Array.from(nodes).forEach(node => {
    node.setAttribute('data-processed', 'true')
    node.innerHTML = '<svg><path class="flowchart-link" /></svg>'
  })
  return Promise.resolve()
})

jest.mock('next/navigation', () => ({
  usePathname: () => '/posts/mermaid'
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ isDarkMode: mockIsDarkMode })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    const config = {
      CODE_LINE_NUMBERS: false,
      CODE_MAC_BAR: false,
      CODE_COLLAPSE: false,
      CODE_COLLAPSE_EXPAND_DEFAULT: false,
      PRISM_JS_AUTO_LOADER: '/prism-autoloader.js',
      PRISM_JS_PATH: '/prism-languages/',
      PRISM_THEME_SWITCH: false,
      PRISM_THEME_DARK_PATH: '',
      PRISM_THEME_LIGHT_PATH: '',
      PRISM_THEME_PREFIX_PATH: '',
      MERMAID_CDN: '/mermaid.js'
    }
    return Object.prototype.hasOwnProperty.call(config, key)
      ? config[key]
      : fallback
  })
}))

jest.mock('@/lib/utils', () => ({
  loadExternalResource: (...args) => mockLoadExternalResource(...args)
}))

jest.mock('prismjs', () => ({
  __esModule: true,
  default: {
    plugins: { autoloader: {} },
    hooks: { add: jest.fn() },
    highlightAllUnder: jest.fn()
  }
}))

jest.mock('prismjs/plugins/toolbar/prism-toolbar', () => ({}))
jest.mock('prismjs/plugins/show-language/prism-show-language', () => ({}))
jest.mock(
  'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard',
  () => ({})
)
jest.mock('prismjs/plugins/line-numbers/prism-line-numbers', () => ({}))

async function flushMermaidTimers() {
  await act(async () => {
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()
    jest.advanceTimersByTime(400)
    await Promise.resolve()
  })
}

describe('PrismMac Mermaid theme rendering', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockIsDarkMode = false
    mockInitialize.mockClear()
    mockRun.mockClear()
    mockLoadExternalResource.mockClear()
    window.mermaid = {
      initialize: mockInitialize,
      run: mockRun
    }
    document.body.innerHTML = `
      <div id="article-wrapper">
        <article id="notion-article">
          <pre class="notion-code language-mermaid"><code class="language-mermaid">flowchart TD\nA --&gt; B</code></pre>
        </article>
      </div>
    `
  })

  afterEach(() => {
    delete window.mermaid
    document.documentElement.className = ''
    jest.useRealTimers()
  })

  it('replaces the rendered SVG instead of retaining the light diagram on dark-mode changes', async () => {
    const { rerender } = render(<PrismMac />)
    await flushMermaidTimers()

    expect(document.querySelectorAll('.mermaid-container')).toHaveLength(1)
    expect(mockInitialize).toHaveBeenLastCalledWith(
      expect.objectContaining({ theme: 'default' })
    )

    mockIsDarkMode = true
    rerender(<PrismMac />)
    await flushMermaidTimers()

    expect(document.querySelectorAll('.mermaid-container')).toHaveLength(1)
    expect(mockInitialize).toHaveBeenLastCalledWith(
      expect.objectContaining({ theme: 'dark' })
    )
  })
})
