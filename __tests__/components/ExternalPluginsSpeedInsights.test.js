import { render, screen } from '@testing-library/react'
import ExternalPlugins from '@/components/ExternalPlugins'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    const config = {
      ANALYTICS_VERCEL: false,
      ANALYTICS_VERCEL_SPEED_INSIGHTS: true,
      DISABLE_PLUGIN: false,
      ENABLE_ICON_FONT: false,
      ENABLE_NPROGRSS: false,
      CUSTOM_EXTERNAL_CSS: [],
      CUSTOM_EXTERNAL_JS: []
    }
    return Object.prototype.hasOwnProperty.call(config, key)
      ? config[key]
      : fallback
  })
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    lang: 'zh-CN'
  })
}))

jest.mock('@/lib/utils', () => ({
  isBrowser: false,
  loadExternalResource: jest.fn()
}))

jest.mock('@/lib/db/notion/convertInnerUrl', () => ({
  convertInnerUrl: jest.fn()
}))

jest.mock('@/components/GlobalStyle', () => ({
  GlobalStyle: () => null
}))

jest.mock('@/components/GoogleAdsense', () => ({
  initGoogleAdsense: jest.fn()
}))

jest.mock('next/dynamic', () => loader => {
  const loaderSource = loader?.toString?.() || ''
  if (loaderSource.includes('@vercel/speed-insights/next')) {
    return function MockSpeedInsights() {
      return <div data-testid='vercel-speed-insights' />
    }
  }

  return function MockDynamicComponent() {
    return null
  }
})

describe('ExternalPlugins Vercel Speed Insights', () => {
  it('renders SpeedInsights when the Speed Insights switch is enabled', () => {
    render(<ExternalPlugins NOTION_CONFIG={{}} />)

    expect(screen.getByTestId('vercel-speed-insights')).toBeInTheDocument()
  })
})
