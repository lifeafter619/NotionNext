const fs = require('fs')
const path = require('path')

describe('Notion responsive CSS', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'styles', 'notion.css'),
    'utf8'
  )

  it('keeps collection tables horizontally scrollable in the final style overrides', () => {
    const modernDatabaseSection = css.slice(
      css.indexOf('/* 数据库视图 - 现代化 */')
    )

    expect(modernDatabaseSection).not.toMatch(
      /\.notion-table,\s*\.notion-board,\s*\.notion-gallery\s*{[^}]*overflow:\s*hidden/
    )
    expect(modernDatabaseSection).toMatch(
      /\.notion-table,[\s\S]*?\.notion-board\s*{[\s\S]*?overflow:\s*auto hidden/
    )
  })

  it('keeps simple tables horizontally scrollable after rounded styling', () => {
    const simpleTableRules = Array.from(
      css.matchAll(/\.notion-simple-table\s*{[^}]*}/g)
    ).map(match => match[0])
    const roundedSimpleTableRule = simpleTableRules.find(rule =>
      rule.includes('border-radius')
    )

    expect(roundedSimpleTableRule).toContain('overflow-x: auto')
    expect(roundedSimpleTableRule).toContain('overflow-y: hidden')
  })
})
