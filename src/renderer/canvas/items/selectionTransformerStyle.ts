import type { TransformerConfig } from 'konva/lib/shapes/Transformer'
import { canvasColor } from '../../theme/canvasColors'

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
    anchorSize: 10 * unit,
    anchorCornerRadius: 3 * unit,
    rotateAnchorOffset: 24 * unit,
    rotateAnchorCursor: 'grab',
  }
}
