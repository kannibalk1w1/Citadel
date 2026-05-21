import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../../types'
import { autoArrangeGrid } from './autoArrange'

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

describe('autoArrangeGrid', () => {
  it('arranges selected items into a compact grid from their current top-left bounds', () => {
    const moves = autoArrangeGrid([
      item('c', 500, 300),
      item('a', 100, 100),
      item('b', 400, 100),
      item('d', 200, 500),
    ], 20)

    expect(moves).toEqual([
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 220, y: 100 },
      { id: 'c', x: 100, y: 200 },
      { id: 'd', x: 220, y: 200 },
    ])
  })

  it('returns no moves for a single item', () => {
    expect(autoArrangeGrid([item('a', 0, 0)])).toEqual([])
  })
})
