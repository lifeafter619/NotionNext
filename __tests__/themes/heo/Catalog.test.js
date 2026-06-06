import { render } from '@testing-library/react'
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

  afterEach(() => {
    document.body.innerHTML = ''
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
})
