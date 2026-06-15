import { describe, expect, it } from 'vitest'
import { buildVoidFloorSvg } from './CanvasBackground'

describe('CanvasBackground', () => {
  it('generates a dark void-floor SVG with subtle seams and luminous glints', () => {
    const svg = buildVoidFloorSvg(false)

    expect(svg).toContain('void-floor')
    expect(svg).toContain('data-seam')
    expect(svg).toContain('data-glint')
    expect(svg).not.toContain('data-stone')
  })

  it('adds a restrained alignment lattice when snap to grid is enabled', () => {
    const off = buildVoidFloorSvg(false)
    const on = buildVoidFloorSvg(true)

    expect(on).not.toBe(off)
    expect(on).toContain('snap-lattice')
  })
})
