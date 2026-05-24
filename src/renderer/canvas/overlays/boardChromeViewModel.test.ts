import { describe, expect, it } from 'vitest'
import type { CanvasItem, Viewport } from '../../../types'
import {
  chromeFrameStyle,
  selectedActionStripPosition,
  selectionBounds,
} from './boardChromeViewModel'

const baseItem: CanvasItem = {
  id: 'item-1',
  type: 'image',
  x: 100,
  y: 80,
  width: 240,
  height: 120,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
}

const viewport: Viewport = { x: 20, y: 30, scale: 2 }

describe('board chrome view model', () => {
  it('returns understated gothic frame values for idle and selected items', () => {
    expect(chromeFrameStyle({ selected: false, locked: false })).toEqual({
      stroke: 'rgba(189, 150, 82, 0.34)',
      strokeWidth: 1,
      dash: undefined,
      glowOpacity: 0,
    })

    expect(chromeFrameStyle({ selected: true, locked: false })).toEqual({
      stroke: 'var(--accent)',
      strokeWidth: 1.5,
      dash: undefined,
      glowOpacity: 0.22,
    })
  })

  it('marks locked frames with a dashed muted treatment', () => {
    expect(chromeFrameStyle({ selected: true, locked: true })).toEqual({
      stroke: 'var(--text-muted)',
      strokeWidth: 1.25,
      dash: [6, 4],
      glowOpacity: 0.1,
    })
  })

  it('positions the selected action strip above the item in screen space', () => {
    expect(selectedActionStripPosition(baseItem, viewport)).toEqual({
      left: 460,
      top: 168,
      transform: 'translateX(-50%)',
    })
  })

  it('keeps the selected action strip inside the top edge of the viewport', () => {
    expect(selectedActionStripPosition({ ...baseItem, y: -10 }, viewport)).toEqual({
      left: 460,
      top: 12,
      transform: 'translateX(-50%)',
    })
  })

  it('calculates multi-item bounds with a chrome gutter', () => {
    const bounds = selectionBounds([
      baseItem,
      { ...baseItem, id: 'item-2', x: 20, y: 200, width: 50, height: 60 },
    ])

    expect(bounds).toEqual({
      x: 14,
      y: 74,
      width: 332,
      height: 192,
    })
  })
})
