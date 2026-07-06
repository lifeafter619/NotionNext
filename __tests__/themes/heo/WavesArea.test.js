import { render } from '@testing-library/react'
import WavesArea from '@/themes/heo/components/WavesArea'

jest.mock('styled-jsx/style', () => {
  function JSXStyle() {
    return null
  }
  JSXStyle.dynamic = () => ''
  return {
    __esModule: true,
    default: JSXStyle
  }
})

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    isDarkMode: false
  })
}))

describe('heo WavesArea', () => {
  it('uses CSS breakpoints instead of resize listeners for visibility', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

    const { container } = render(<WavesArea />)

    expect(container.querySelector('.waves-area')).toHaveClass('hidden')
    expect(container.querySelector('.waves-area')).toHaveClass(
      'min-[800px]:block'
    )
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    )

    addEventListenerSpy.mockRestore()
  })
})
