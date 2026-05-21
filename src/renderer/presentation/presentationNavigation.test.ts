import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../types'
import { orderedPresentationItems, nextPresentationIndex } from './presentationNavigation'

function item(id: string, x: number, y: number, visible = true): CanvasItem {
  return {
    id,
    type: 'image',
    x,
    y,
    width: 100,
    height: 80,
    rotation: 0,
    zIndex: 0,
    locked: false,
    visible,
    opacity: 1,
    tags: [],
  }
}

describe('presentationNavigation', () => {
  it('orders visible items top-to-bottom then left-to-right', () => {
    expect(orderedPresentationItems([
      item('bottom', 0, 200),
      item('right', 200, 0),
      item('hidden', 0, 0, false),
      item('left', 0, 0),
    ]).map((entry) => entry.id)).toEqual(['left', 'right', 'bottom'])
  })

  it('returns the next index from the current item id', () => {
    const items = [item('a', 0, 0), item('b', 100, 0), item('c', 200, 0)]

    expect(nextPresentationIndex(items, 'b', 1)).toBe(2)
    expect(nextPresentationIndex(items, 'b', -1)).toBe(0)
  })

  it('starts at the nearest end when no current item is focused', () => {
    const items = [item('a', 0, 0), item('b', 100, 0)]

    expect(nextPresentationIndex(items, null, 1)).toBe(0)
    expect(nextPresentationIndex(items, null, -1)).toBe(1)
  })

  it('allows the caller to detect board crossing', () => {
    const items = [item('a', 0, 0), item('b', 100, 0)]

    expect(nextPresentationIndex(items, 'b', 1)).toBe(2)
    expect(nextPresentationIndex(items, 'a', -1)).toBe(-1)
  })
})
