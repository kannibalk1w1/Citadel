import { describe, expect, it } from 'vitest'
import type { CanvasItem, Viewport } from '../../../types'
import { createLargeBoardFixture } from '../../performance/largeBoardFixture'
import { canvasViewportBounds, visibleItemIds } from './viewportVisibility'

const viewport: Viewport = { x: -200, y: -100, scale: 2 }

function item(id: string, x: number, y: number, visible = true): CanvasItem {
  return {
    id,
    type: 'image',
    x,
    y,
    width: 100,
    height: 80,
    rotation: 0,
    zIndex: 1,
    locked: false,
    visible,
    opacity: 1,
    tags: [],
  }
}

describe('viewportVisibility', () => {
  it('converts screen viewport dimensions into overscanned canvas bounds', () => {
    expect(canvasViewportBounds(viewport, { width: 800, height: 600 }, 40)).toEqual({
      x: 80,
      y: 30,
      width: 440,
      height: 340,
    })
  })

  it('returns visible item IDs that intersect the viewport bounds', () => {
    const items = [
      item('inside', 120, 80),
      item('edge', 500, 360),
      item('outside', 700, 500),
      item('hidden', 140, 120, false),
    ]

    expect(visibleItemIds(items, viewport, { width: 800, height: 600 }, { overscanPx: 40 })).toEqual(['inside', 'edge'])
  })

  it('keeps explicit visible IDs mounted even outside the viewport', () => {
    const items = [
      item('inside', 120, 80),
      item('selected-outside', 900, 900),
      item('hidden-selected', 940, 940, false),
    ]

    expect(visibleItemIds(items, viewport, { width: 800, height: 600 }, {
      overscanPx: 0,
      alwaysIncludeIds: ['selected-outside', 'hidden-selected'],
    })).toEqual(['inside', 'selected-outside'])
  })

  it('filters the large-board fixture down to viewport-near IDs', () => {
    const fixture = createLargeBoardFixture({ itemCount: 1000, columns: 50 })

    const ids = visibleItemIds(fixture.board.items, { x: 0, y: 0, scale: 1 }, { width: 540, height: 280 })

    expect(ids).toEqual([
      'fixture-relic-0000',
      'fixture-relic-0001',
      'fixture-relic-0002',
      'fixture-relic-0003',
      'fixture-relic-0050',
      'fixture-relic-0051',
      'fixture-relic-0052',
      'fixture-relic-0053',
      'fixture-relic-0100',
      'fixture-relic-0101',
      'fixture-relic-0102',
      'fixture-relic-0103',
    ])
  })
})
