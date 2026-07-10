import fs from 'fs'
import path from 'path'

describe('react-notion-x file override', () => {
  it('delegates file blocks to components.File when provided', () => {
    const rendererPath = path.join(
      process.cwd(),
      'node_modules',
      'react-notion-x',
      'build',
      'index.js'
    )
    const rendererSource = fs.readFileSync(rendererPath, 'utf8')

    expect(rendererSource).toContain('components.File || File')
  })
})
