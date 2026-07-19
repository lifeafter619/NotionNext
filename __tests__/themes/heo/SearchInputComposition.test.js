import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SearchInput from '@/themes/heo/components/SearchInput'

const mockPush = jest.fn(() => Promise.resolve(true))

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) =>
    key === 'SUB_PATH' ? '/blog' : defaultValue
  )
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      SEARCH: {
        ARTICLES: '搜索文章'
      }
    }
  })
}))

describe('HEO SearchInput IME handling', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('does not submit the Enter key that commits an IME composition', async () => {
    render(<SearchInput />)
    const input = screen.getByRole('textbox', { name: '搜索文章' })

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '中文' } })
    fireEvent.keyDown(input, {
      key: 'Enter',
      keyCode: 13,
      isComposing: true
    })
    fireEvent.compositionEnd(input)
    fireEvent.keyUp(input, { key: 'Enter', keyCode: 13 })

    expect(mockPush).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/blog/search/%E4%B8%AD%E6%96%87'
      })
    })
  })
})
