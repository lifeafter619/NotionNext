import { render, screen, waitFor } from '@testing-library/react'
import VisitorInfoCard from '@/themes/heo/components/VisitorInfoCard'
import CONFIG from '@/themes/heo/config'

const mockSiteConfig = jest.fn()

jest.mock('@/lib/config', () => ({
  siteConfig: (...args) => mockSiteConfig(...args)
}))

jest.mock('@/themes/heo/components/Card', () => {
  return function Card({ children }) {
    return <div>{children}</div>
  }
})

describe('HEO VisitorInfoCard storage and privacy handling', () => {
  let getItem

  beforeEach(() => {
    mockSiteConfig.mockReturnValue(false)
    getItem = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue('not-a-number')
    fetch.mockResolvedValue({
      json: async () => ({
        code: 500
      })
    })
  })

  it.each([undefined, false])(
    'does not request visitor location when the flag is %p',
    async enabled => {
      mockSiteConfig.mockReturnValue(enabled)

      render(<VisitorInfoCard />)

      expect(screen.getByText('欢迎您的来访~')).toBeInTheDocument()
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
      await waitFor(() => expect(fetch).not.toHaveBeenCalled())
    }
  )

  it('uses the fallback location service when explicitly enabled', async () => {
    mockSiteConfig.mockReturnValue(true)
    fetch
      .mockRejectedValueOnce(new Error('primary service unavailable'))
      .mockResolvedValueOnce({
        json: async () => ({
          city: 'Shanghai',
          region: 'Shanghai',
          country_name: 'China'
        })
      })

    render(<VisitorInfoCard />)

    expect(screen.getByText('加载中...')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Shanghai')).toBeInTheDocument())
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.vore.top/api/IPdata',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://ipapi.co/json/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('shows an unknown location when both enabled services fail', async () => {
    mockSiteConfig.mockReturnValue(true)
    fetch.mockRejectedValue(new Error('location services unavailable'))

    render(<VisitorInfoCard />)

    await waitFor(() =>
      expect(screen.getByText('未知地区')).toBeInTheDocument()
    )
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('describes Busuanzi site views as cumulative views', () => {
    const siteViews = document.createElement('span')
    siteViews.className = 'busuanzi_value_site_pv'
    siteViews.textContent = '42'
    document.body.appendChild(siteViews)

    render(<VisitorInfoCard />)

    expect(
      screen.getByText(
        (_, element) =>
          element.tagName === 'SPAN' &&
          element.textContent === '本站内容已被浏览 42 次'
      )
    ).toBeInTheDocument()
    expect(screen.queryByText(/今天的第/)).not.toBeInTheDocument()
  })

  it('keeps visitor location opt-in in the HEO project config', () => {
    expect(CONFIG.HEO_VISITOR_LOCATION_ENABLE).toBe(false)
  })

  it('falls back to zero minutes when stored reading time is invalid', async () => {
    render(<VisitorInfoCard />)

    await waitFor(() => {
      expect(screen.queryByText('NaN')).not.toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  it('does not refresh the displayed clock every second', () => {
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation(() => 0)

    const { unmount } = render(<VisitorInfoCard />)

    expect(setIntervalSpy).not.toHaveBeenCalledWith(expect.any(Function), 1000)

    unmount()
    setIntervalSpy.mockRestore()
  })

  afterEach(() => {
    getItem?.mockRestore()
  })
})
