import { THEMES } from '@/conf/theme.config'
import {
  DYNAMIC_THEME_LAYOUTS,
  getDynamicThemeLayout
} from '@/themes/dynamicThemeLayouts'

describe('dynamic theme layout registry', () => {
  it('registers every supported theme at module scope', () => {
    expect(Object.keys(DYNAMIC_THEME_LAYOUTS).sort()).toEqual(
      [...THEMES].sort()
    )
  })

  it('returns the registered component without creating it during render', () => {
    for (const theme of THEMES) {
      expect(getDynamicThemeLayout(theme)).toBe(DYNAMIC_THEME_LAYOUTS[theme])
    }
    expect(getDynamicThemeLayout('missing-theme')).toBeNull()
  })
})
