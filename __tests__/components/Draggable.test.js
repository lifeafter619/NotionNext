import { render } from '@testing-library/react'
import { Draggable } from '@/components/Draggable'

describe('Draggable', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('removes pointer and resize handlers when unmounted', () => {
    const { container, unmount } = render(
      <Draggable>
        <button type='button'>Drag me</button>
      </Draggable>
    )
    const dragRoot = container.querySelector('.draggable')
    const removePointerListener = jest.spyOn(dragRoot, 'removeEventListener')
    const removeWindowListener = jest.spyOn(window, 'removeEventListener')

    unmount()

    for (const eventName of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel'
    ]) {
      expect(removePointerListener).toHaveBeenCalledWith(
        eventName,
        expect.any(Function)
      )
    }
    expect(removeWindowListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    )
  })
})
