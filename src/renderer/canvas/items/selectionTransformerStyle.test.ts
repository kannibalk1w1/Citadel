import { describe, expect, it } from 'vitest'
import { selectionTransformerStyle } from './selectionTransformerStyle'

describe('selectionTransformerStyle', () => {
  it('keeps the selection border and handles the same screen size as canvas zoom changes', () => {
    expect(selectionTransformerStyle(1)).toMatchObject({
      borderStrokeWidth: 1.25,
      anchorSize: 10,
      anchorCornerRadius: 3,
      rotateAnchorOffset: 24,
    })
    expect(selectionTransformerStyle(2)).toMatchObject({
      borderStrokeWidth: 0.625,
      anchorSize: 5,
      anchorCornerRadius: 1.5,
      rotateAnchorOffset: 12,
    })
  })
})
