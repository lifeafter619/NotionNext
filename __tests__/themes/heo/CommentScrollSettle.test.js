import { scrollToHeoComment } from '@/themes/heo/components/commentScroll'

describe('scrollToHeoComment 瞬时跳转与懒加载校正', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    document.body.innerHTML = '<div id="post-comments"></div>'
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0
    })
    window.scrollTo = jest.fn(({ top }) => {
      window.scrollY = top
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('无锚点时返回 false', () => {
    document.body.innerHTML = ''
    expect(scrollToHeoComment()).toBe(false)
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('瞬时跳转，懒加载推移锚点后瞬时校正，稳定后停止', () => {
    const anchor = document.getElementById('post-comments')
    // 锚点在文档中的绝对位置
    let anchorTop = 1000
    anchor.getBoundingClientRect = () => ({ top: anchorTop - window.scrollY })

    expect(scrollToHeoComment()).toBe(true)
    // 直接瞬时跳转，不再用 smooth 动画
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 920,
      behavior: 'instant'
    })

    // 分享栏/推荐文章懒加载挂载，把锚点推下 600px
    anchorTop = 1600
    jest.advanceTimersByTime(150)
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 1520,
      behavior: 'instant'
    })

    // 位置稳定且已到位后，不再重复滚动
    const callsAfterSettle = window.scrollTo.mock.calls.length
    jest.advanceTimersByTime(4000)
    expect(window.scrollTo.mock.calls.length).toBe(callsAfterSettle)
  })

  it('用户滚动打断后停止校正', () => {
    const anchor = document.getElementById('post-comments')
    let anchorTop = 1000
    anchor.getBoundingClientRect = () => ({ top: anchorTop - window.scrollY })

    scrollToHeoComment()
    const callsAfterJump = window.scrollTo.mock.calls.length

    // 用户滚动打断
    window.dispatchEvent(new Event('wheel'))
    // 之后锚点即使继续位移也不再校正
    anchorTop = 2000
    jest.advanceTimersByTime(2000)
    expect(window.scrollTo.mock.calls.length).toBe(callsAfterJump)
  })
})
