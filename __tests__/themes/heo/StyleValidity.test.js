const fs = require('fs')
const path = require('path')

const readSource = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8')

describe('HEO style validity', () => {
  const styleSource = readSource('themes', 'heo', 'style.js')
  const darkModeButton = readSource(
    'themes',
    'heo',
    'components',
    'DarkModeButton.js'
  )
  const infoCard = readSource('themes', 'heo', 'components', 'InfoCard.js')
  const postHeader = readSource('themes', 'heo', 'components', 'PostHeader.js')
  const postAdjacent = readSource(
    'themes',
    'heo',
    'components',
    'PostAdjacent.js'
  )
  const hero = readSource('themes', 'heo', 'components', 'Hero.js')
  const packageJson = JSON.parse(readSource('package.json'))

  it('uses valid CSS comments inside the global style template', () => {
    const css = styleSource.match(/<style jsx global>{`([\s\S]*?)`}<\/style>/)?.[1]

    expect(css).toBeDefined()
    expect(css).not.toMatch(/^\s*\/\/.*$/m)
  })

  it('uses valid Tailwind utility tokens in HEO components', () => {
    expect(darkModeButton).not.toContain('hover: scale-')
    expect(darkModeButton).toContain('hover:scale-100')
    expect(darkModeButton).toContain('hover:scale-50')

    expect(infoCard).not.toContain('transitaion-all')
    expect(infoCard).toContain('transition-all')

    expect(postHeader).not.toContain('font-sm')
    expect(postHeader).toContain('text-sm')

    expect(postAdjacent).not.toContain('h-18')
    expect(postAdjacent).toContain('min-h-[4.5rem]')

    expect(hero).not.toContain("className={`'${")
  })

  it('includes themes in lint and lint-fix scope', () => {
    expect(packageJson.scripts.lint).toMatch(/\bthemes\b/)
    expect(packageJson.scripts['lint:fix']).toMatch(/\bthemes\b/)
  })
})
