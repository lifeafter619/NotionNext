const fs = require('fs')
const path = require('path')
const { THEMES } = require('@/conf/theme.config')

describe('built-in theme registry', () => {
  it('registers every complete theme directory exactly once', () => {
    const themesRoot = path.join(process.cwd(), 'themes')
    const themeDirectories = fs
      .readdirSync(themesRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('__'))
      .filter(entry => {
        const directory = path.join(themesRoot, entry.name)
        return (
          fs.existsSync(path.join(directory, 'index.js')) &&
          fs.existsSync(path.join(directory, 'config.js'))
        )
      })
      .map(entry => entry.name)
      .sort()

    expect([...new Set(THEMES)].sort()).toEqual(themeDirectories)
    expect(THEMES).toHaveLength(new Set(THEMES).size)
    expect(THEMES).toContain('opc')
  })
})
