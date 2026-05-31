import { render, screen, waitFor } from '@testing-library/react'
import VisitorInfoCard from '@/themes/heo/components/VisitorInfoCard'

jest.mock('@/themes/heo/components/Card', () => {
  return function Card({ children }) {
    return <div>{children}</div>
  }
})

describe('HEO VisitorInfoCard storage handling', () => {
  let getItem

  beforeEach(() => {
    getItem = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockReturnValue('not-a-number')
    fetch.mockResolvedValue({
      json: async () => ({
        code: 500
      })
    })
  })

  it('falls back to zero minutes when stored reading time is invalid', async () => {
    render(<VisitorInfoCard />)

    await waitFor(() => {
      expect(screen.queryByText('NaN')).not.toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  afterEach(() => {
    getItem?.mockRestore()
  })
})
