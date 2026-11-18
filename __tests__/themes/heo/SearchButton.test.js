import { fireEvent, render, screen } from '@testing-library/react'
import SearchButton from '@/themes/heo/components/SearchButton'

const pushMock = jest.fn()

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      ALGOLIA_APP_ID: 'app-id',
      ALGOLIA_SEARCH_ONLY_APP_KEY: null,
      ALGOLIA_INDEX: null
    }
    return config[key] ?? null
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      NAV: {
        SEARCH: 'Search'
      }
    }
  })
}))

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: pushMock
  })
}))

describe('heo SearchButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('falls back to local search when Algolia public search configuration is incomplete', () => {
    render(<SearchButton />)

    fireEvent.click(screen.getAllByTitle('Search')[0])

    expect(pushMock).toHaveBeenCalledWith('/search')
  })
})
