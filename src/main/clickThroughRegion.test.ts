import { describe, expect, it } from 'vitest'
import {
  CLICK_THROUGH_CAPTURE_MARGIN_PX,
  CLICK_THROUGH_POLL_MS,
  expandRect,
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
    // Well clear of the panel and its approach halo at the moved position.
    expect(shouldCaptureMouse({ x: 400, y: 300 }, moved, panel)).toBe(false)
    expect(shouldCaptureMouse({ x: 1050, y: 730 }, moved, panel)).toBe(true)
  })

  /**
   * The panel used to be effectively unclickable. The window only takes the
   * mouse back on a poll tick, so a click landing within one interval of the
   * cursor arriving went to the app behind instead — and since click-through
   * exists to work with that app, the click was swallowed by a focused window
   * and the button looked dead. Capturing across a halo means the reclaim has
   * already happened by the time the pointer is on the button.
   */
  it('takes the mouse back while the cursor is still approaching the panel', () => {
    const justAbove = { x: 1150, y: 750 - CLICK_THROUGH_CAPTURE_MARGIN_PX + 4 }
    const justLeft = { x: 1100 - CLICK_THROUGH_CAPTURE_MARGIN_PX + 4, y: 780 }

    expect(shouldCaptureMouse(justAbove, bounds, panel)).toBe(true)
    expect(shouldCaptureMouse(justLeft, bounds, panel)).toBe(true)
  })

  it('still lets clicks through beyond the halo', () => {
    const wellAbove = { x: 1150, y: 750 - CLICK_THROUGH_CAPTURE_MARGIN_PX - 4 }

    expect(shouldCaptureMouse(wellAbove, bounds, panel)).toBe(false)
  })

  it('gives the halo a head start over the poll interval', () => {
    // At a gentle 600 px/s approach the halo must be worth more than one tick,
    // or the cursor can still arrive before the window has taken the mouse.
    const headStartMs = (CLICK_THROUGH_CAPTURE_MARGIN_PX / 600) * 1000

    expect(headStartMs).toBeGreaterThan(CLICK_THROUGH_POLL_MS)
  })

  it('can be asked for the unpadded region, which is what the panel covers', () => {
    const justOutside = { x: 1150, y: 750 - 4 }

    expect(shouldCaptureMouse(justOutside, bounds, panel, 1, 0)).toBe(false)
    expect(shouldCaptureMouse({ x: 1150, y: 780 }, bounds, panel, 1, 0)).toBe(true)
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

describe('expandRect', () => {
  const rect = { x: 100, y: 100, width: 50, height: 20 }

  it('grows on every side', () => {
    expect(expandRect(rect, 10)).toEqual({ x: 90, y: 90, width: 70, height: 40 })
  })

  it('leaves a rect alone for no margin', () => {
    expect(expandRect(rect, 0)).toEqual(rect)
  })

  it('refuses to shrink a rect, which could make the panel unreachable', () => {
    expect(expandRect(rect, -30)).toEqual(rect)
  })
})

describe('poll interval', () => {
  it('is responsive without being a busy loop', () => {
    expect(CLICK_THROUGH_POLL_MS).toBeGreaterThanOrEqual(50)
    expect(CLICK_THROUGH_POLL_MS).toBeLessThanOrEqual(250)
  })
})
