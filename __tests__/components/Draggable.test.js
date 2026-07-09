import { render } from '@testing-library/react'
import { Draggable } from '@/components/Draggable'

describe('Draggable', () => {
  beforeEach(() => {
    document.onmousedown = null
    document.ontouchstart = null
    document.onmousemove = null
    document.ontouchmove = null
    document.onmouseup = null
    document.ontouchend = null
  })

  afterEach(() => {
    document.onmousedown = null
    document.ontouchstart = null
    document.onmousemove = null
    document.ontouchmove = null
    document.onmouseup = null
    document.ontouchend = null
  })

  it('removes document drag handlers when unmounted', () => {
    const { unmount } = render(
      <Draggable>
        <button type='button'>Drag me</button>
      </Draggable>
    )

    expect(document.onmousedown).toEqual(expect.any(Function))
    expect(document.ontouchstart).toEqual(expect.any(Function))

    unmount()

    expect(document.onmousedown).toBeNull()
    expect(document.ontouchstart).toBeNull()
    expect(document.onmousemove).toBeNull()
    expect(document.ontouchmove).toBeNull()
    expect(document.onmouseup).toBeNull()
    expect(document.ontouchend).toBeNull()
  })
})
