import { act, render, screen } from '@testing-library/react'
import AISummary from '@/components/AISummary'

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      AI_SUMMARY: {
        NAME: 'AI Summary'
      }
    }
  })
}))

describe('AISummary', () => {
  let now = 0

  beforeEach(() => {
    jest.useFakeTimers()
    now = 0
    jest.spyOn(performance, 'now').mockImplementation(() => now)
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => {
      return setTimeout(() => {
        now += 20
        callback(now)
      }, 0)
    })
    jest
      .spyOn(global, 'cancelAnimationFrame')
      .mockImplementation(timerId => clearTimeout(timerId))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const runTypingAnimation = text => {
    for (let i = 0; i <= text.length; i++) {
      act(() => {
        jest.runOnlyPendingTimers()
      })
    }
  }

  it('starts from an empty summary instead of flashing the full text', () => {
    const { container } = render(<AISummary aiSummary='First summary' />)

    const explanation = container.querySelector('[class*="ai-explanation"]')
    expect(explanation).toBeInTheDocument()
    expect(explanation).toHaveTextContent('')
    expect(screen.queryByText('First summary')).not.toBeInTheDocument()
  })

  it('updates rendered summary when the post summary changes', () => {
    const { rerender } = render(<AISummary aiSummary='First summary' />)

    runTypingAnimation('First summary')
    expect(screen.getByText('First summary')).toBeInTheDocument()

    rerender(<AISummary aiSummary='Second summary' />)

    expect(screen.queryByText('First summary')).not.toBeInTheDocument()
    runTypingAnimation('Second summary')
    expect(screen.getByText('Second summary')).toBeInTheDocument()
  })
})
