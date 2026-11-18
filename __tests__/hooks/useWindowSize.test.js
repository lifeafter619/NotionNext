/**
 * @jest-environment node
 */
import React from 'react'
import { TextEncoder } from 'util'
import useWindowSize from '@/hooks/useWindowSize'

function WindowSizeProbe() {
  const size = useWindowSize()
  return <span>{`${size.width}x${size.height}`}</span>
}

describe('useWindowSize', () => {
  it('does not read document during server render', () => {
    global.TextEncoder = global.TextEncoder || TextEncoder
    const { renderToString } = require('react-dom/server')

    expect(() => renderToString(<WindowSizeProbe />)).not.toThrow()
    expect(renderToString(<WindowSizeProbe />)).toContain('0x0')
  })
})
