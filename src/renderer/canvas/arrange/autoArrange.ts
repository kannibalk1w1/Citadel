import type { CanvasItem } from '../../../types'

export type ItemMove = { id: string; x: number; y: number }

const DEFAULT_GAP = 24

// Rows fill to roughly this multiple of the square root of the total item area,
// which keeps the result close to square instead of one long strip.
const ROW_ASPECT = 1.25

// Shelf packing: items keep their own size and rows are only as tall as the
// tallest item in them. The earlier version laid out a uniform grid whose cell
// was the largest item in the selection, so one big image spaced every
// thumbnail as though it were equally large.
export function autoArrangeGrid(items: CanvasItem[], gap = DEFAULT_GAP): ItemMove[] {
  if (items.length < 2) return []

  const ordered = [...items].sort((a, b) => (a.y - b.y) || (a.x - b.x))
  const minX = Math.min(...ordered.map((item) => item.x))
  const minY = Math.min(...ordered.map((item) => item.y))
  const totalArea = ordered.reduce((sum, item) => sum + item.width * item.height, 0)
  const widest = Math.max(...ordered.map((item) => item.width))
  const targetWidth = Math.max(widest, Math.sqrt(totalArea) * ROW_ASPECT)

  const moves: ItemMove[] = []
  let x = minX
  let y = minY
  let rowHeight = 0

  for (const item of ordered) {
    const wouldOverflow = x > minX && (x - minX) + item.width > targetWidth
    if (wouldOverflow) {
      x = minX
      y += rowHeight + gap
      rowHeight = 0
    }
    moves.push({ id: item.id, x, y })
    x += item.width + gap
    rowHeight = Math.max(rowHeight, item.height)
  }

  return moves
}
