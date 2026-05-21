import { describe, expect, it } from 'vitest'
import type { CanvasItem, Viewport } from '../../types'
import { buildMinimapModel, containsRectPoint, viewportForMinimapCenter, viewportForMinimapDrag } from './minimapModel'

function item(id: string, x: number, y: number, width = 100, height = 80): CanvasItem {
  return {
    id,
    type: 'image',
    x,
    y,
    width,
    height,
    rotation: 0,
    zIndex: 0,
    locked: false,
    visible: true,
    opacity: 1,
    tags: [],
  }
}

describe('minimapModel', () => {
  it('builds item and viewport rectangles in minimap space', () => {
    const viewport: Viewport = { x: -50, y: -25, scale: 1 }

    const model = buildMinimapModel(
      [item('a', 0, 0), item('b', 200, 100)],
      viewport,
      ['b'],
      160,
      100,
      800,
      600,
    )

    expect(model.items.find((rect) => rect.id === 'b')?.selected).toBe(true)
    expect(model.viewport.x).toBeGreaterThan(model.transform.ox)
    expect(model.viewport.width).toBeGreaterThan(160)
  })

  it('converts minimap clicks into centered viewport coordinates', () => {
    const next = viewportForMinimapCenter(80, 50, { scale: 0.5, ox: 0, oy: 0 }, 2, 800, 600)

    expect(next).toEqual({ x: 80, y: 100 })
  })

  it('drags the viewport rectangle without re-centering it under the cursor', () => {
    const next = viewportForMinimapDrag({ x: -100, y: -50, scale: 2 }, 10, 5, { scale: 0.5, ox: 0, oy: 0 })

    expect(next).toEqual({ x: -140, y: -70 })
  })

  it('detects points inside the viewport rectangle', () => {
    expect(containsRectPoint({ x: 10, y: 20, width: 30, height: 40 }, 25, 35)).toBe(true)
    expect(containsRectPoint({ x: 10, y: 20, width: 30, height: 40 }, 45, 35)).toBe(false)
  })
})
