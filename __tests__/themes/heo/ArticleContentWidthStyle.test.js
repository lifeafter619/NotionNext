const fs = require('fs')
const path = require('path')

describe('heo article content width styles', () => {
  const styleSource = fs.readFileSync(
    path.join(process.cwd(), 'themes', 'heo', 'style.js'),
    'utf8'
  )

  it('lets article text blocks fill the same content width as article chrome', () => {
    const contentWidthRule = styleSource.match(
      /#theme-heo #notion-article \.notion-text,[\s\S]*?\.notion-page-link \{[\s\S]*?\}/
    )?.[0]

    expect(contentWidthRule).toContain('max-width: 100%')
    expect(contentWidthRule).not.toContain('820px')
  })
})
