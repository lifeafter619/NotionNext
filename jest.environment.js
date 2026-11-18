const Module = require('module')
const { TestEnvironment } = require('jest-environment-jsdom')

class JsdomEnvironmentWithoutCanvas extends TestEnvironment {
  constructor(config, context) {
    const originalResolveFilename = Module._resolveFilename

    Module._resolveFilename = function resolveWithoutCanvas(
      request,
      parent,
      isMain,
      options
    ) {
      if (request === 'canvas') {
        const error = new Error("Cannot find module 'canvas'")
        error.code = 'MODULE_NOT_FOUND'
        throw error
      }

      return originalResolveFilename.call(
        this,
        request,
        parent,
        isMain,
        options
      )
    }

    try {
      // jsdom treats canvas as optional, but a half-installed native canvas package
      // makes environment startup fail before any tests run.
      super(config, context)
    } finally {
      Module._resolveFilename = originalResolveFilename
    }
  }
}

module.exports = JsdomEnvironmentWithoutCanvas
