import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../types'
import { itemsForFittedExport } from './exportCanvas'

const baseItem: CanvasItem = {
  id: 'item-1',
  type: 'image',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
}

describe('exportCanvas', () => {
  it('uses selected items for fitted selection export', () => {
    const items = [
      { ...baseItem, id: 'image-1' },
      { ...baseItem, id: 'image-2' },
      { ...baseItem, id: 'comment-1', type: 'sticky', meta: { kind: 'comment' } },
    ] satisfies CanvasItem[]

    expect(itemsForFittedExport(items, 'selection', ['image-2', 'comment-1'], false).map((item) => item.id)).toEqual(['image-2'])
  })

  it('returns no fitted items for selection export without a selection', () => {
    expect(itemsForFittedExport([{ ...baseItem, id: 'image-1' }], 'selection', [], true)).toEqual([])
  })
})
