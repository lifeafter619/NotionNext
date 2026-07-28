import { render, screen } from '@testing-library/react'
import NotionIcon from '@/themes/heo/components/NotionIcon'

jest.mock('@/components/LazyImage', () => {
  return function MockLazyImage(props) {
    return <img {...props} />
  }
})

describe('heo NotionIcon', () => {
  it('passes fixed dimensions to remote page icons', () => {
    render(
      <NotionIcon
        icon='https://img.cdn.619.pp.ua/image/attachment%3Apage-icon'
        size={24}
      />
    )

    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('width', '24')
    expect(image).toHaveAttribute('height', '24')
    expect(image).toHaveAttribute('sizes', '24px')
  })
})
