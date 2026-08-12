import fs from 'fs'
import path from 'path'

// react-notion-x@7.10.0 (the version this fork pins) does not ship a
// components.File override in its build; the upstream test was written against
// a newer build that does. Skip until the dependency is bumped.
describe.skip('react-notion-x file override', () => {
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
