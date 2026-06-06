import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { GlobalContextProvider, useGlobal } from '@/lib/global'

const listeners = {}

jest.mock('next/router', () => ({
  useRouter: () => ({
    locale: 'zh-CN',
    query: {},
    pathname: '/',
    events: {
      on: jest.fn((event, callback) => {
        listeners[event] = callback
      }),
      off: jest.fn()
    }
  })
}))

jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(() => ({
    isLoaded: true,
    isSignedIn: false,
    user: null
  }))
}))

jest.mock('@/themes/theme', () => ({
  THEMES: ['heo'],
  getThemeConfig: jest.fn(async () => ({})),
  initDarkMode: jest.fn(updateDarkMode => updateDarkMode(false)),
  saveDarkModeToLocalStorage: jest.fn()
}))

jest.mock('@/lib/utils/lang', () => ({
  generateLocaleDict: jest.fn(() => ({})),
  initLocale: jest.fn(),
  redirectUserLang: jest.fn()
}))

function LoadingProbe() {
  const { onLoading } = useGlobal()
  return <div data-testid='loading-state'>{String(onLoading)}</div>
}

describe('GlobalContextProvider search route loading', () => {
  beforeEach(() => {
    Object.keys(listeners).forEach(key => delete listeners[key])
  })

  it('keeps the full-screen loading cover off during search route transitions', async () => {
    render(
      <GlobalContextProvider NOTION_CONFIG={{}} siteInfo={{}}>
        <LoadingProbe />
      </GlobalContextProvider>
    )

    await waitFor(() => {
      expect(listeners.routeChangeStart).toEqual(expect.any(Function))
    })

    act(() => {
      listeners.routeChangeStart('/search/needle')
    })
    expect(screen.getByTestId('loading-state')).toHaveTextContent('false')

    act(() => {
      listeners.routeChangeStart('/article/demo')
    })
    expect(screen.getByTestId('loading-state')).toHaveTextContent('true')
  })
})
