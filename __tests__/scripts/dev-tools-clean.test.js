jest.mock('fs', () => ({
  existsSync: jest.fn(),
  rmSync: jest.fn(),
  writeFileSync: jest.fn()
}))

jest.mock('child_process', () => ({
  execSync: jest.fn(() => '')
}))

const fs = require('fs')
const { execSync } = require('child_process')
const { clean } = require('../../scripts/dev-tools')

describe('dev-tools clean', () => {
  let logSpy

  beforeEach(() => {
    fs.existsSync.mockReturnValue(true)
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('removes generated directories with the filesystem API instead of shelling out to rm -rf', () => {
    clean()

    expect(fs.rmSync).toHaveBeenCalledWith(expect.stringContaining('.next'), {
      recursive: true,
      force: true
    })
    expect(fs.rmSync).toHaveBeenCalledWith(expect.stringContaining('out'), {
      recursive: true,
      force: true
    })
    expect(execSync).not.toHaveBeenCalledWith(
      expect.stringContaining('rm -rf'),
      expect.anything()
    )
  })
})
