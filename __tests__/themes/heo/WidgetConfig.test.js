import { render, screen } from '@testing-library/react'

const mockConfig = {}

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultValue) =>
    Object.prototype.hasOwnProperty.call(mockConfig, key)
      ? mockConfig[key]
      : defaultValue
  )
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ fullWidth: false })
}))

jest.mock('next/dynamic', () => () => () => null)
jest.mock('@/themes/heo/components/InfoCard', () => ({
  InfoCard: () => <div data-testid='info-card' />
}))
jest.mock('@/themes/heo/components/VisitorInfoCard', () => () => null)
jest.mock('@/themes/heo/components/TouchMeCard', () => () => null)
jest.mock('@/themes/heo/components/TagGroups', () => () => null)
jest.mock('@/themes/heo/components/Catalog', () => () => null)
jest.mock('@/themes/heo/components/Card', () => ({ children }) => (
  <div>{children}</div>
))
jest.mock('@/themes/heo/components/useArticleToc', () => ({
  useArticleToc: () => []
}))
jest.mock('@/themes/heo/components/LatestPostsGroupMini', () => () => (
  <div data-testid='latest-posts' />
))
jest.mock('@/themes/heo/components/AnalyticsCard', () => ({
  AnalyticsCard: () => <div data-testid='analytics-card' />
}))

const SideRight = require('@/themes/heo/components/SideRight').default

describe('heo widget configuration', () => {
  beforeEach(() => {
    Object.keys(mockConfig).forEach(key => delete mockConfig[key])
  })

  it('hides latest posts and analytics when their widget flags are disabled', () => {
    mockConfig.HEO_WIDGET_LATEST_POSTS = false
    mockConfig.HEO_WIDGET_ANALYTICS = false

    render(<SideRight tagOptions={[]} />)

    expect(screen.queryByTestId('latest-posts')).not.toBeInTheDocument()
    expect(screen.queryByTestId('analytics-card')).not.toBeInTheDocument()
  })
})
