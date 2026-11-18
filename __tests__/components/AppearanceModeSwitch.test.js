import { fireEvent, render, screen } from '@testing-library/react'
import AppearanceModeSwitch from '@/components/AppearanceModeSwitch'

const setAppearanceMode = jest.fn()

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    appearanceMode: 'system',
    setAppearanceMode,
    locale: {
      MENU: {
        LIGHT_MODE: '浅色模式',
        SYSTEM_MODE: '跟随系统',
        DARK_MODE: '深色模式'
      }
    }
  })
}))

describe('AppearanceModeSwitch', () => {
  it('places system mode between light and dark and selects it explicitly', () => {
    render(<AppearanceModeSwitch />)

    const buttons = screen.getAllByRole('button')
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual([
      '浅色模式',
      '跟随系统',
      '深色模式'
    ])

    fireEvent.click(screen.getByRole('button', { name: '跟随系统' }))
    expect(setAppearanceMode).toHaveBeenCalledWith('system')
  })

  it('provides responsive mobile and desktop system icons without JS detection', () => {
    render(<AppearanceModeSwitch />)

    expect(screen.getByTestId('system-mobile-icon')).toHaveClass('md:hidden')
    expect(screen.getByTestId('system-desktop-icon')).toHaveClass('hidden')
    expect(screen.getByTestId('system-desktop-icon')).toHaveClass('md:block')
  })
})
