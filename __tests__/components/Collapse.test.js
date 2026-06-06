import { render, act } from '@testing-library/react'
import Collapse from '@/components/Collapse'

describe('Collapse', () => {
  let scrollHeightSpy
  let scrollWidthSpy

  beforeEach(() => {
    jest.useFakeTimers()
    scrollHeightSpy = jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(120)
    scrollWidthSpy = jest
      .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
      .mockReturnValue(240)
  })

  afterEach(() => {
    scrollHeightSpy.mockRestore()
    scrollWidthSpy.mockRestore()
    jest.useRealTimers()
  })

  it('restores vertical height to auto after the expand transition', () => {
    const { container } = render(
      <Collapse isOpen={true}>
        <div>Expanded content</div>
      </Collapse>
    )

    const panel = container.firstElementChild
    expect(panel.style.height).toBe('120px')

    act(() => {
      jest.advanceTimersByTime(400)
    })

    expect(panel.style.height).toBe('auto')
  })

  it('restores horizontal width to auto after the expand transition', () => {
    const { container } = render(
      <Collapse type='horizontal' isOpen={true}>
        <div>Expanded content</div>
      </Collapse>
    )

    const panel = container.firstElementChild
    expect(panel.style.width).toBe('240px')

    act(() => {
      jest.advanceTimersByTime(400)
    })

    expect(panel.style.width).toBe('auto')
  })
})
