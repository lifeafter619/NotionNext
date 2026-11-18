import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RandomPostButton from '@/themes/heo/components/RandomPostButton'

const mockPush = jest.fn()
const mockSiteConfig = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: (...args) => mockSiteConfig(...args)
}))

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      MENU: { WALK_AROUND: '随便逛逛' }
    }
  })
}))

describe('heo RandomPostButton', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockSiteConfig.mockImplementation((key, defaultValue) =>
      key === 'SUB_PATH' ? '/blog' : defaultValue
    )
  })

  it('is disabled when there are no linkable posts', () => {
    render(<RandomPostButton latestPosts={[{}, null]} />)

    expect(
      screen.getByRole('button', { name: '随便逛逛' })
    ).toBeDisabled()
  })

  it('navigates once and includes SUB_PATH for a slug', async () => {
    const user = userEvent.setup()
    render(<RandomPostButton latestPosts={[{ slug: 'posts/demo' }]} />)

    await user.click(screen.getByRole('button', { name: '随便逛逛' }))

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/blog/posts/demo')
  })
})
