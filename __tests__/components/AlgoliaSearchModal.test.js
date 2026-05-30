import { render } from '@testing-library/react'
import React from 'react'
import AlgoliaSearchModal from '@/components/AlgoliaSearchModal'

jest.mock('algoliasearch', () =>
  jest.fn(() => ({
    initIndex: jest.fn(() => ({
      search: jest.fn()
    }))
  }))
)

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn(key => {
    const config = {
      ALGOLIA_APP_ID: 'app-id',
      ALGOLIA_SEARCH_ONLY_APP_KEY: null,
      ALGOLIA_INDEX: null,
      SUB_PATH: ''
    }
    return config[key] ?? null
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    tagOptions: []
  })
}))

jest.mock('react-hotkeys-hook', () => ({
  useHotkeys: jest.fn()
}))

describe('AlgoliaSearchModal', () => {
  it('does not initialize Algolia when public search configuration is incomplete', () => {
    const algoliasearchMock = require('algoliasearch')
    const { container } = render(
      <AlgoliaSearchModal cRef={React.createRef()} />
    )

    expect(container).toBeEmptyDOMElement()
    expect(algoliasearchMock).not.toHaveBeenCalled()
  })
})
