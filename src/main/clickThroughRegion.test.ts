import { describe, expect, it } from 'vitest'
import {
  CLICK_THROUGH_POLL_MS,
  normalizeRegion,
  pointInRect,
  regionToScreenRect,
  shouldCaptureMouse,
} from './clickThroughRegion'

const bounds = { x: 100, y: 50, width: 1200, height: 800 }
const panel = { x: 1000, y: 700, width: 180, height: 60 }

describe('regionToScreenRect', () => {
  it('offsets a renderer rect by the window content position', () => {
    expect(regionToScreenRect(panel, bounds)).toEqual({ x: 1100, y: 750, width: 180, height: 60 })
  })

  // UI scale changes CSS pixel size without moving the window, so a reported
  // rect means something different on screen at each zoom level.
  it('scales by the renderer zoom factor', () => {
    expect(regionToScreenRect({ x: 10, y: 20, width: 100, height: 40 }, bounds, 1.5))
      .toEqual({ x: 100 + 15, y: 50 + 30, width: 150, height: 60 })
  })

  it('ignores a nonsensical zoom rather than collapsing the rect', () => {
    expect(regionToScreenRect(panel, bounds, 0)).toEqual(regionToScreenRect(panel, bounds, 1))
    expect(regionToScreenRect(panel, bounds, Number.NaN)).toEqual(regionToScreenRect(panel, bounds, 1))
  })
})

describe('pointInRect', () => {
  const rect = { x: 10, y: 10, width: 100, height: 50 }

  it('accepts a point inside and on the edges', () => {
    expect(pointInRect({ x: 50, y: 30 }, rect)).toBe(true)
    expect(pointInRect({ x: 10, y: 10 }, rect)).toBe(true)
    expect(pointInRect({ x: 110, y: 60 }, rect)).toBe(true)
  })

  it('rejects a point outside on any side', () => {
    expect(pointInRect({ x: 9, y: 30 }, rect)).toBe(false)
    expect(pointInRect({ x: 111, y: 30 }, rect)).toBe(false)
    expect(pointInRect({ x: 50, y: 9 }, rect)).toBe(false)
    expect(pointInRect({ x: 50, y: 61 }, rect)).toBe(false)
  })

  it('rejects everything for a rect with no area', () => {
    expect(pointInRect({ x: 0, y: 0 }, { x: 0, y: 0, width: 0, height: 0 })).toBe(false)
  })
})

describe('shouldCaptureMouse', () => {
  it('takes the mouse back while the cursor is over the panel', () => {
    expect(shouldCaptureMouse({ x: 1150, y: 780 }, bounds, panel)).toBe(true)
  })

  it('leaves clicks passing through everywhere else in the window', () => {
    expect(shouldCaptureMouse({ x: 200, y: 200 }, bounds, panel)).toBe(false)
  })

  it('leaves clicks passing through outside the window entirely', () => {
    expect(shouldCaptureMouse({ x: 5, y: 5 }, bounds, panel)).toBe(false)
  })

  // Failing towards click-through keeps the promise the mode made; failing the
  // other way would silently swallow clicks the user expected to pass through.
  it('captures nothing when there is no panel to protect', () => {
    expect(shouldCaptureMouse({ x: 1150, y: 780 }, bounds, null)).toBe(false)
  })

  it('follows the window when it moves', () => {
    const moved = { ...bounds, x: 0, y: 0 }
    expect(shouldCaptureMouse({ x: 1150, y: 780 }, moved, panel)).toBe(false)
    expect(shouldCaptureMouse({ x: 1050, y: 730 }, moved, panel)).toBe(true)
  })
})

describe('normalizeRegion', () => {
  it('accepts a well-formed rect', () => {
    expect(normalizeRegion(panel)).toEqual(panel)
  })

  it('rejects anything malformed rather than trusting the renderer', () => {
    expect(normalizeRegion(null)).toBeNull()
    expect(normalizeRegion({})).toBeNull()
    expect(normalizeRegion({ x: 1, y: 2, width: 3 })).toBeNull()
    expect(normalizeRegion({ x: 'a', y: 2, width: 3, height: 4 })).toBeNull()
    expect(normalizeRegion({ x: 1, y: 2, width: Number.NaN, height: 4 })).toBeNull()
  })

  it('rejects a rect with no area, which could never be hovered', () => {
    expect(normalizeRegion({ x: 1, y: 2, width: 0, height: 4 })).toBeNull()
    expect(normalizeRegion({ x: 1, y: 2, width: 3, height: -4 })).toBeNull()
  })

  it('drops extra fields instead of passing them along', () => {
    expect(normalizeRegion({ ...panel, evil: true })).toEqual(panel)
  })
})

describe('poll interval', () => {
  it('is responsive without being a busy loop', () => {
    expect(CLICK_THROUGH_POLL_MS).toBeGreaterThanOrEqual(50)
    expect(CLICK_THROUGH_POLL_MS).toBeLessThanOrEqual(250)
  })
})
