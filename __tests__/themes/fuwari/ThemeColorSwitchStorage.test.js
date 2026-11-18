import { render, screen, waitFor } from '@testing-library/react'
import ThemeColorSwitch from '@/themes/fuwari/components/ThemeColorSwitch'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, fallback) => {
    const config = {
      FUWARI_WIDGET_THEME_COLOR_SWITCHER: true,
      FUWARI_THEME_COLOR_HUE: 250
    }
    return config[key] ?? fallback
  })
}))

describe('Fuwari ThemeColorSwitch storage handling', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses the default hue when the stored hue is invalid', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('not-a-number')

    render(
      <div id='theme-fuwari'>
        <ThemeColorSwitch />
      </div>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '250' })).toBeInTheDocument()
    })

    expect(document.getElementById('theme-fuwari')).toHaveStyle({
      '--fuwari-gradient':
        'linear-gradient(135deg, hsl(250, 85%, 62%) 0%, hsl(295, 88%, 70%) 100%)'
    })
  })
})
