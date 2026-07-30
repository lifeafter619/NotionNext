import { scrollToHeoComment } from '@/themes/heo/components/commentScroll'

describe('scrollToHeoComment 懒加载位置校正', () => {
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
    jest.useRealTimers()
  })

  it('无锚点时返回 false', () => {
    document.body.innerHTML = ''
    expect(scrollToHeoComment()).toBe(false)
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('懒加载内容推移锚点后自动校正，稳定后停止', () => {
    const anchor = document.getElementById('post-comments')
    // 锚点在文档中的绝对位置
    let anchorTop = 1000
    anchor.getBoundingClientRect = () => ({ top: anchorTop - window.scrollY })

    expect(scrollToHeoComment()).toBe(true)
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 920,
      behavior: 'smooth'
    })

    // 分享栏/推荐文章懒加载挂载，把锚点推下 600px
    anchorTop = 1600
    jest.advanceTimersByTime(400)
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 1520,
      behavior: 'smooth'
    })

    // 位置稳定且已到位后，不再重复滚动
    const callsAfterSettle = window.scrollTo.mock.calls.length
    jest.advanceTimersByTime(4000)
    expect(window.scrollTo.mock.calls.length).toBe(callsAfterSettle)
  })
})
