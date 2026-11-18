import { act, fireEvent, render, screen } from '@testing-library/react'
import { siteConfig } from '@/lib/config'
import { NoticeBar } from '@/themes/heo/components/NoticeBar'
import Swipe from '@/themes/heo/components/Swipe'

jest.mock('styled-jsx/style', () => () => null)
jest.mock('@/lib/config', () => ({ siteConfig: jest.fn() }))
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ locale: { COMMON: { NOW: 'Now' } } })
}))

const notices = [
  { title: 'First', url: '/first' },
  { title: 'Second', url: '/second' }
]

beforeEach(() => {
  jest.useFakeTimers()
  siteConfig.mockImplementation((key, fallback) => {
    if (key === 'HEO_NOTICE_BAR') return JSON.stringify(notices)
    if (key === 'HEO_NOTICE_BAR_INTERVAL') return '1000'
    return fallback
  })
})

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

it('uses the configured interval without exposing inactive notices', () => {
  render(<NoticeBar />)
  act(() => jest.advanceTimersByTime(1000))
  expect(screen.getByRole('link')).toHaveTextContent('Second')
})

it('reads full notice text in a dialog and pauses rotation until close', () => {
  const originalShowModal = HTMLDialogElement.prototype.showModal
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  try {
    const title = 'Long notification without a destination'
    const { container } = render(<Swipe items={[{ title }, notices[1]]} />)
    fireEvent.click(screen.getByRole('button', { name: title }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(title)
    expect(jest.getTimerCount()).toBe(0)
    dialog.removeAttribute('open')
    fireEvent(dialog, new Event('close'))
    act(() => jest.advanceTimersByTime(3000))
    expect(container.querySelector('a')).toHaveClass('translate-y-0')
  } finally {
    if (originalShowModal)
      HTMLDialogElement.prototype.showModal = originalShowModal
    else delete HTMLDialogElement.prototype.showModal
  }
})
