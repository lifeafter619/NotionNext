import fs from 'fs'
import path from 'path'
import postcss from 'postcss'

const projectFile = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8')

const notionCss = projectFile('styles', 'notion.css')
const notionStyles = postcss.parse(notionCss)
const appSource = projectFile('pages', '_app.js')
const endspaceStyles = projectFile('themes', 'endspace', 'style.js')
const claudeStyles = projectFile('themes', 'claude', 'style.js')

const foregroundColors = [
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'red'
]
const backgroundColors = [...foregroundColors, 'default']
const backgroundVariants = ['background', 'background_co']

function getFinalDeclaration(selector, property) {
  let value

  notionStyles.walkRules(rule => {
    if (!rule.selectors?.includes(selector)) return

    rule.walkDecls(property, declaration => {
      value = declaration.value
    })
  })

  return value
}

function getFinalDeclarationNode(selector, property) {
  let result

  notionStyles.walkRules(rule => {
    if (!rule.selectors?.includes(selector)) return

    rule.walkDecls(property, declaration => {
      result = declaration
    })
  })

  return result
}

describe('Notion color support', () => {
  it('loads project overrides after the react-notion-x base stylesheet', () => {
    const baseStylesIndex = appSource.indexOf(
      "import 'react-notion-x/src/styles.css'"
    )
    const projectOverridesIndex = appSource.indexOf(
      "import '@/styles/notion.css'"
    )

    expect(baseStylesIndex).toBeGreaterThanOrEqual(0)
    expect(projectOverridesIndex).toBeGreaterThan(baseStylesIndex)
  })

  it.each(foregroundColors)(
    'maps the %s foreground and collection color classes',
    color => {
      expect(getFinalDeclaration(`.notion-${color}`, 'color')).toBe(
        `var(--notion-${color})`
      )
      expect(getFinalDeclaration(`.notion-${color}_co`, 'color')).toBe(
        `var(--notion-${color})`
      )
    }
  )

  it.each(backgroundColors)(
    'maps the %s inline and collection background classes',
    color => {
      expect(
        getFinalDeclaration(`.notion-${color}_background`, 'background-color')
      ).toBe(`var(--notion-${color}_background)`)
      expect(
        getFinalDeclaration(
          `.notion-${color}_background_co`,
          'background-color'
        )
      ).toBe(`var(--notion-${color}_background_co)`)
    }
  )

  it('defines a complete project dark-mode color palette', () => {
    foregroundColors.forEach(color => {
      expect(getFinalDeclaration('.dark', `--notion-${color}`)).toBeTruthy()
    })

    backgroundColors.forEach(color => {
      expect(
        getFinalDeclaration('.dark', `--notion-${color}_background`)
      ).toBeTruthy()
      expect(
        getFinalDeclaration('.dark', `--notion-${color}_background_co`)
      ).toBeTruthy()
    })
  })

  it('gives authored colors priority over decorative block themes', () => {
    foregroundColors.forEach(color => {
      const declaration = getFinalDeclarationNode(
        `.notion [class].notion-${color}`,
        'color'
      )

      expect(declaration?.value).toBe(`var(--notion-${color})`)
      expect(declaration?.important).toBe(true)
    })

    backgroundColors.forEach(color => {
      backgroundVariants.forEach(variant => {
        const selector = `.notion [class].notion-${color}_${variant}`
        const colorDeclaration = getFinalDeclarationNode(
          selector,
          'background-color'
        )
        const imageDeclaration = getFinalDeclarationNode(
          selector,
          'background-image'
        )

        expect(colorDeclaration?.value).toBe(`var(--notion-${color}_${variant})`)
        expect(colorDeclaration?.important).toBe(true)
        expect(imageDeclaration?.value).toBe('none')
        expect(imageDeclaration?.important).toBe(true)
      })
    })
  })

  it('does not let theme-wide inline selectors erase Notion colors', () => {
    expect(endspaceStyles).not.toContain(
      '#theme-endspace #notion-article span,'
    )
    expect(endspaceStyles).not.toContain(
      '#theme-endspace #notion-article strong,'
    )
    expect(claudeStyles).not.toContain('#theme-claude .notion-quote span,')
    expect(claudeStyles).toContain(
      ".notion-callout:not([class*='_background_co'])"
    )

    const endspaceNotionOverrides = endspaceStyles.slice(
      endspaceStyles.indexOf('Notion Content Overrides (Light Mode)'),
      endspaceStyles.indexOf('Headers - NieR: Automata Style')
    )
    expect(endspaceNotionOverrides).not.toMatch(
      /color:\s*var\(--endspace-text-(?:primary|secondary)\)\s*!important/
    )
  })
})
