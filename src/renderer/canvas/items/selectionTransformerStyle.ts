import type { TransformerConfig } from 'konva/lib/shapes/Transformer'
import { canvasColor } from '../../theme/canvasColors'

/**
 * Drawn size of a resize handle, in screen pixels. Big enough to aim at
 * without hunting: the handles are the whole affordance for resizing, and a
 * near-invisible square is one the pointer keeps sliding off.
 */
export const SELECTION_ANCHOR_SIZE = 14

/**
 * Extra grabbable margin around each handle, in screen pixels. Konva sizes an
 * anchor's hit region to the square it draws, so the target is widened here
 * rather than by drawing something even chunkier over the reference.
 */
export const SELECTION_ANCHOR_HIT_PADDING = 6

// Konva's transformer is expressed in canvas coordinates, so without this
// conversion its border and handles become tiny when zoomed out and enormous
// when zoomed in. Keep the affordance a calm, usable screen size everywhere.
export function selectionTransformerStyle(viewportScale: number): Partial<TransformerConfig> {
  const unit = 1 / Math.max(0.05, viewportScale)
  return {
    padding: 4 * unit,
    borderStroke: canvasColor('accent'),
    borderStrokeWidth: 1.25 * unit,
    anchorFill: canvasColor('bgPanel'),
    anchorStroke: canvasColor('accent'),
    anchorStrokeWidth: 1.5 * unit,
    anchorSize: SELECTION_ANCHOR_SIZE * unit,
    anchorCornerRadius: 3 * unit,
    // Clear of the enlarged corner handles rather than sitting on top of them.
    rotateAnchorOffset: 30 * unit,
    rotateAnchorCursor: 'grab',
    // hitStrokeWidth straddles the anchor's edge, so half of it reaches outward.
    anchorStyleFunc: (anchor) => { anchor.hitStrokeWidth(SELECTION_ANCHOR_HIT_PADDING * 2 * unit) },
  }
}
