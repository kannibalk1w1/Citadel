import { describe, expect, it } from 'vitest'
import { buildBrokenCobblestoneSvg } from './CanvasBackground'

describe('CanvasBackground', () => {
  it('generates a broken cobblestone SVG with cracks and chips', () => {
    const svg = buildBrokenCobblestoneSvg(false)

    expect(svg).toContain('data-crack')
    expect(svg).toContain('data-chip')
    expect(svg).toContain('dark-mortar')
  })

  it('raises seam contrast when snap to grid is enabled', () => {
    const off = buildBrokenCobblestoneSvg(false)
    const on = buildBrokenCobblestoneSvg(true)

    expect(on).not.toBe(off)
    expect(on).toContain('snap-mortar')
  })
})
