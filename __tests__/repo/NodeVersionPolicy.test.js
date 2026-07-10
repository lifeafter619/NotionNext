const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', '..')

function parseVersion(version) {
  return version
    .trim()
    .replace(/^v/, '')
    .split('.')
    .map(part => Number(part))
}

function isAtLeast(version, minimum) {
  const current = parseVersion(version)
  const required = parseVersion(minimum)

  for (let index = 0; index < required.length; index++) {
    const currentPart = current[index] || 0
    const requiredPart = required[index] || 0

    if (currentPart > requiredPart) return true
    if (currentPart < requiredPart) return false
  }

  return true
}

describe('Node version policy', () => {
  it('keeps CI on a Node version supported by the dependency tree', () => {
    const nvmrc = fs.readFileSync(path.join(root, '.nvmrc'), 'utf8')

    expect(isAtLeast(nvmrc, '22')).toBe(true)
  })

  it('documents the same minimum Node version in package engines', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8')
    )

    expect(packageJson.engines.node).toContain('>=22')
  })
})
