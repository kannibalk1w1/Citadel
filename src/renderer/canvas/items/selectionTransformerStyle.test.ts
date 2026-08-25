import { describe, expect, it } from 'vitest'
import { SELECTION_ANCHOR_SIZE, selectionTransformerStyle } from './selectionTransformerStyle'

describe('selectionTransformerStyle', () => {
  it('keeps the selection border and handles the same screen size as canvas zoom changes', () => {
    expect(selectionTransformerStyle(1)).toMatchObject({
      borderStrokeWidth: 1.25,
      anchorSize: SELECTION_ANCHOR_SIZE,
      anchorCornerRadius: 3,
      rotateAnchorOffset: 30,
    })
    expect(selectionTransformerStyle(2)).toMatchObject({
      borderStrokeWidth: 0.625,
      anchorSize: SELECTION_ANCHOR_SIZE / 2,
      anchorCornerRadius: 1.5,
      rotateAnchorOffset: 15,
    })
  })

  it('gives every handle a hit area wider than the square it draws', () => {
    const hitWidths: number[] = []
    const anchor = { hitStrokeWidth: (value: number) => hitWidths.push(value) }

    selectionTransformerStyle(1).anchorStyleFunc?.(anchor as never)
    selectionTransformerStyle(2).anchorStyleFunc?.(anchor as never)

    // Half of hitStrokeWidth reaches outside the anchor, and it tracks zoom the
    // same way the drawn size does.
    expect(hitWidths).toEqual([12, 6])
  })
})
