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

  it('packs mixed sizes without padding small items to the largest', () => {
    const moves = autoArrangeGrid([
      item('big', 0, 0, 300, 200),
      item('s1', 400, 0, 60, 60),
      item('s2', 0, 300, 60, 60),
      item('s3', 100, 300, 60, 60),
    ], 20)

    // The three thumbnails sit side by side under the large image, each one
    // its own width apart. A uniform grid would have spaced them 300px apart.
    expect(moves).toEqual([
      { id: 'big', x: 0, y: 0 },
      { id: 's1', x: 0, y: 220 },
      { id: 's2', x: 80, y: 220 },
      { id: 's3', x: 160, y: 220 },
    ])
  })

  it('gives an item wider than the target row a row of its own', () => {
    const moves = autoArrangeGrid([
      item('wide', 0, 0, 900, 40),
      item('a', 0, 200, 80, 80),
      item('b', 200, 200, 80, 80),
    ], 20)

    expect(moves[0]).toEqual({ id: 'wide', x: 0, y: 0 })
    expect(moves[1].y).toBeGreaterThan(0)
    expect(moves[1].y).toBe(moves[2].y)
  })

  it('returns no moves for a single item', () => {
    expect(autoArrangeGrid([item('a', 0, 0)])).toEqual([])
  })
})
