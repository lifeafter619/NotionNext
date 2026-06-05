import { render, screen, waitFor } from '@testing-library/react'
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
    document.body.innerHTML = `
      <article id="notion-article">
        <h2 class="notion-h notion-h2" data-id="heading-one">Heading One</h2>
      </article>
    `
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the floating toc button from article headings when post.toc is missing', async () => {
    render(<FloatTocButton post={{ title: 'Demo article' }} lock={false} />)

    await waitFor(() => {
      expect(screen.getAllByText('目录导航').length).toBeGreaterThan(0)
    })
  })
})
