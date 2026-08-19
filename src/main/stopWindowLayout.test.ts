import { describe, expect, it } from 'vitest'
import { STOP_WINDOW_MARGIN, STOP_WINDOW_SIZE, stopWindowBounds, windowModeTarget } from './stopWindowLayout'

const size = STOP_WINDOW_SIZE
const m = STOP_WINDOW_MARGIN

describe('stopWindowBounds', () => {
  it('rests in the bottom-right of the work area', () => {
    expect(stopWindowBounds({ x: 0, y: 0, width: 2560, height: 1600 })).toEqual({
      x: 2560 - size.width - m,
      y: 1600 - size.height - m,
      ...size,
    })
  })

  it('clears a taskbar, because the work area already excludes one', () => {
    // A dock 80px tall at the bottom, and a 28px panel at the top.
    const bounds = stopWindowBounds({ x: 0, y: 28, width: 2560, height: 1600 - 28 - 80 })

    expect(bounds.y + bounds.height).toBe(28 + (1600 - 28 - 80) - m)
  })

  it('follows a display that does not start at the origin', () => {
    const bounds = stopWindowBounds({ x: 2560, y: 0, width: 1920, height: 1080 })

    expect(bounds.x).toBe(2560 + 1920 - size.width - m)
  })

  it('stays on screen when the display is smaller than the control', () => {
    // Never off the top-left: the one control that ends click-through has to be
    // reachable even on an absurd display.
    const bounds = stopWindowBounds({ x: 100, y: 50, width: 80, height: 20 })

    expect(bounds.x).toBe(100)
    expect(bounds.y).toBe(50)
  })

  it('gives whole pixels, which is what setBounds takes', () => {
    const bounds = stopWindowBounds({ x: 0, y: 0, width: 1365.5, height: 767.25 })

    expect(Number.isInteger(bounds.x)).toBe(true)
    expect(Number.isInteger(bounds.y)).toBe(true)
  })
})

describe('windowModeTarget', () => {
  const main = { id: 1 }
  const stop = { id: 2 }

  it('sends a request from the Stop control to the window it belongs to', () => {
    expect(windowModeTarget(stop, stop, main)).toBe(main)
  })

  it('leaves an ordinary request on its own window', () => {
    expect(windowModeTarget(main, stop, main)).toBe(main)
  })

  it('is a plain passthrough while the Stop control is closed', () => {
    expect(windowModeTarget(main, null, null)).toBe(main)
  })

  it('has nothing to act on if the owner is already gone', () => {
    expect(windowModeTarget(stop, stop, null)).toBeNull()
  })
})
