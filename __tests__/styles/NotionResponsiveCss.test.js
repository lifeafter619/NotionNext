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

  it('keeps callout icons top-aligned and dynamically sized in the final overrides', () => {
    const calloutRules = Array.from(
      css.matchAll(/(?:^|\n)\.notion-callout\s*{[^}]*}/g)
    ).map(match => match[0].trim())
    const iconRules = Array.from(
      css.matchAll(/(?:^|\n)\.notion-callout \.notion-page-icon\s*{[^}]*}/g)
    ).map(match => match[0].trim())

    const finalCalloutRule = calloutRules.at(-1)
    const finalIconRule = iconRules.at(-1)

    expect(finalCalloutRule).toContain('align-items: flex-start')
    expect(finalCalloutRule).not.toMatch(/padding:\s*10px\s+2px/)
    expect(finalCalloutRule).toMatch(/padding:\s*[^;]*em/)

    expect(finalIconRule).toContain('align-self: flex-start')
    expect(finalIconRule).toContain('font-size: 1em')
    expect(finalIconRule).toMatch(/width:\s*1(?:\.\d+)?em/)
    expect(finalIconRule).toMatch(/height:\s*1(?:\.\d+)?em/)
    expect(finalIconRule).not.toMatch(/width:\s*24px/)
    expect(finalIconRule).not.toMatch(/height:\s*24px/)
  })
})
