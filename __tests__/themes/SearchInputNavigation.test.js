import { fireEvent, render, waitFor } from '@testing-library/react'
import React from 'react'
import MediumSearchInput from '@/themes/medium/components/SearchInput'
import SimpleSearchInput from '@/themes/simple/components/SearchInput'
import MagzineSearchInput from '@/themes/magzine/components/SearchInput'
import ThoughtliteSearchInput from '@/themes/thoughtlite/components/SearchInput'
import ExampleSearchInput from '@/themes/example/components/SearchInput'
import PhotoSearchInput from '@/themes/photo/components/SearchInput'
import GameSearchInput from '@/themes/game/components/SearchInput'
import NobeliumSearchInput from '@/themes/nobelium/components/SearchInput'
import ProxioSearchInput from '@/themes/proxio/components/SearchInput'
import StarterSearchInput from '@/themes/starter/components/SearchInput'
import HexoSearchInput from '@/themes/hexo/components/SearchInput'
import HeoSearchInput from '@/themes/heo/components/SearchInput'
import MaterySearchInput from '@/themes/matery/components/SearchInput'
import MovieSearchInput from '@/themes/movie/components/SearchInput'
import PlogSearchInput from '@/themes/plog/components/SearchInput'
import NextSearchInput from '@/themes/next/components/SearchInput'
import FukasawaSearchInput from '@/themes/fukasawa/components/SearchInput'
import CommerceSearchInput from '@/themes/commerce/components/SearchInput'

const mockRouterPush = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    query: {},
    push: mockRouterPush
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(() => null)
}))

jest.mock('@/lib/plugins/algoliaConfig', () => ({
  isAlgoliaSearchEnabled: jest.fn(() => false)
}))

jest.mock('@/themes/next', () => ({
  useNextGlobal: () => ({
    searchModal: { current: { openSearch: jest.fn() } }
  })
}))

jest.mock('@/themes/fukasawa', () => ({
  useFukasawaGlobal: () => ({
    searchModal: { current: { openSearch: jest.fn() } }
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      NAV: {
        SEARCH: 'Search'
      },
      SEARCH: {
        TAGS: 'Tags',
        ARTICLES: 'Articles'
      }
    }
  })
}))

describe.each([
  ['medium', MediumSearchInput, { currentSearch: '' }],
  ['simple', SimpleSearchInput, { keyword: '' }],
  ['magzine', MagzineSearchInput, { currentSearch: '' }],
  ['thoughtlite', ThoughtliteSearchInput, { keyword: '' }],
  ['example', ExampleSearchInput, { keyword: '' }],
  ['photo', PhotoSearchInput, { keyword: '' }],
  ['game', GameSearchInput, { keyword: '' }],
  ['nobelium', NobeliumSearchInput, { keyword: '' }],
  ['proxio', ProxioSearchInput, { keyword: '' }],
  ['starter', StarterSearchInput, { keyword: '' }],
  ['hexo', HexoSearchInput, { currentSearch: '' }],
  ['heo', HeoSearchInput, { currentSearch: '' }],
  ['matery', MaterySearchInput, { currentSearch: '' }],
  ['movie', MovieSearchInput, { currentSearch: '' }],
  ['plog', PlogSearchInput, { currentSearch: '' }],
  ['next', NextSearchInput, { currentSearch: '' }],
  ['fukasawa', FukasawaSearchInput, { keyword: '' }],
  ['commerce', CommerceSearchInput, { currentSearch: '' }]
])('%s SearchInput navigation', (_theme, SearchInput, props) => {
  beforeEach(() => {
    mockRouterPush.mockClear()
    mockRouterPush.mockResolvedValue(true)
  })

  it('uses client-side navigation with an encoded search keyword', async () => {
    const { container } = render(
      <SearchInput {...props} cRef={React.createRef()} />
    )
    const input = container.querySelector('input')

    fireEvent.change(input, { target: { value: 'hello 世界' } })
    fireEvent.keyUp(input, { key: 'Enter', keyCode: 13 })

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: '/search/hello%20%E4%B8%96%E7%95%8C'
      })
    })
  })
})

describe('heo controlled SearchInput', () => {
  it('synchronizes the textbox when currentSearch changes', () => {
    const { container, rerender } = render(
      <HeoSearchInput currentSearch='alpha' cRef={React.createRef()} />
    )

    expect(container.querySelector('input')).toHaveValue('alpha')

    rerender(
      <HeoSearchInput currentSearch='beta' cRef={React.createRef()} />
    )

    expect(container.querySelector('input')).toHaveValue('beta')
  })

  it('keeps composition text visible while the input is controlled', () => {
    const { container } = render(
      <HeoSearchInput currentSearch='' cRef={React.createRef()} />
    )
    const input = container.querySelector('input')

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '中' } })

    expect(input).toHaveValue('中')
  })
})
