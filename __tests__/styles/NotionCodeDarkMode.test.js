import fs from 'fs'
import path from 'path'
import postcss from 'postcss'

const readProjectFile = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8')

const prismStyles = postcss.parse(
  readProjectFile('styles', 'prism-code.css')
)
const notionStyles = postcss.parse(readProjectFile('styles', 'notion.css'))

function getDeclaration(styles, selector, property) {
  let value
  styles.walkRules(rule => {
    if (!rule.selectors?.includes(selector)) return
    rule.walkDecls(property, declaration => {
      value = declaration.value
    })
  })
  return value
}

describe('Notion code dark-mode surfaces', () => {
  it('gives standalone code blocks explicit light and dark borders', () => {
    expect(
      getDeclaration(
        prismStyles,
        "pre.notion-code[class*='language-']",
        'border'
      )
    ).toBeTruthy()
    expect(
      getDeclaration(
        prismStyles,
        ":where(.dark) pre.notion-code[class*='language-']",
        'border-color'
      )
    ).toBeTruthy()
  })

  it('uses a genuinely dark Mermaid code background in dark mode', () => {
    expect(
      getDeclaration(
        notionStyles,
        ".dark pre[class*='language-mermaid']",
        'background-color'
      )
    ).toBe('#1e1e1e')
  })
})
