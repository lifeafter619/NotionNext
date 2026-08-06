/**
 * @jest-environment node
 */
import fs from 'node:fs'
import path from 'node:path'

function getJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return getJavaScriptFiles(fullPath)
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : []
  })
}

describe('theme audit consistency', () => {
  const themeFiles = getJavaScriptFiles(path.join(process.cwd(), 'themes'))

  it('cleans up every configurable delayed 404 timer', () => {
    const offenders = themeFiles.filter(file => {
      const source = fs.readFileSync(file, 'utf8')
      return (
        source.includes('POST_WAITING_TIME_FOR_404') &&
        !source.includes('clearTimeout')
      )
    })

    expect(offenders).toEqual([])
  })

  it('encodes every dynamic category path segment', () => {
    const offenders = themeFiles.flatMap(file => {
      const source = fs.readFileSync(file, 'utf8')
      const matches = source.match(/\/category\/\$\{(?!encodeURIComponent)/g)
      return matches ? [file] : []
    })

    expect(offenders).toEqual([])
  })
})
