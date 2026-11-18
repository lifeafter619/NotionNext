import { act, render } from '@testing-library/react'
import PrismMac from '@/components/PrismMac'

const mockResize = jest.fn()
const mockLoadExternalResource = jest.fn(() => Promise.resolve())

jest.mock('next/navigation', () => ({
  usePathname: () => '/posts/example'
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ isDarkMode: false })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    const config = {
      CODE_LINE_NUMBERS: true,
      CODE_MAC_BAR: false,
      CODE_COLLAPSE: false,
      CODE_COLLAPSE_EXPAND_DEFAULT: false,
      PRISM_JS_AUTO_LOADER: '/prism-autoloader.js',
      PRISM_JS_PATH: '/prism-languages/',
      PRISM_THEME_SWITCH: false,
      PRISM_THEME_DARK_PATH: '',
      PRISM_THEME_LIGHT_PATH: '',
      PRISM_THEME_PREFIX_PATH: '',
      MERMAID_CDN: ''
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
    plugins: {
      autoloader: {},
      lineNumbers: {
        resize: (...args) => mockResize(...args)
      }
    },
    hooks: {
      add: jest.fn()
    },
    highlightAll: jest.fn(),
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

describe('PrismMac line number alignment', () => {
  let requestAnimationFrameSpy
  let cancelAnimationFrameSpy

  beforeEach(() => {
    jest.useFakeTimers()
    mockResize.mockClear()
    mockLoadExternalResource.mockClear()

    document.body.innerHTML = `
      <div id="article-wrapper">
        <article id="notion-article">
          <pre class="notion-code language-js"><code class="language-js">const one = 1;
const two = 2;</code></pre>
        </article>
      </div>
    `

    requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        callback()
        return 1
      })
    cancelAnimationFrameSpy = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()
    document.documentElement.className = ''
    jest.useRealTimers()
  })

  it('recalibrates code line numbers when accessibility font size class changes', async () => {
    const { unmount } = render(<PrismMac />)

    await act(async () => {
      jest.advanceTimersByTime(100)
      await Promise.resolve()
    })

    expect(mockResize).toHaveBeenCalled()
    mockResize.mockClear()

    await act(async () => {
      document.documentElement.classList.add('font-extra-large')
      await Promise.resolve()
    })

    expect(mockResize).toHaveBeenCalled()
    unmount()
  })
})
