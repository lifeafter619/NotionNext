import { act, render } from '@testing-library/react'
import { useState } from 'react'
import useThrottledScroll from '@/hooks/useThrottledScroll'

function fireScroll(times) {
  for (let i = 0; i < times; i++) {
    window.dispatchEvent(new Event('scroll'))
  }
}

function Probe({ onScroll }) {
  // 每次滚动都改 state，强制 re-render——这正是旧写法丢失节流状态的场景
  const [count, setCount] = useState(0)
  useThrottledScroll(() => {
    setCount(c => c + 1)
    onScroll()
  }, 500)
  return <span data-testid='count'>{count}</span>
}

describe('useThrottledScroll', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('throttles across re-renders instead of firing on every event', () => {
    const onScroll = jest.fn()
    render(<Probe onScroll={onScroll} />)

    act(() => {
      fireScroll(20)
    })

    // 旧写法（每次 render 重建 throttle）会得到 20 次
    expect(onScroll).toHaveBeenCalledTimes(1)
  })

  it('allows the next call after the throttle window elapses', () => {
    const onScroll = jest.fn()
    render(<Probe onScroll={onScroll} />)

    act(() => {
      fireScroll(5)
    })
    expect(onScroll).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(600)
      fireScroll(5)
    })
    expect(onScroll).toHaveBeenCalledTimes(2)
  })

  it('removes its listener on unmount', () => {
    const onScroll = jest.fn()
    const { unmount } = render(<Probe onScroll={onScroll} />)

    unmount()
    act(() => {
      fireScroll(5)
    })

    expect(onScroll).not.toHaveBeenCalled()
  })
})
