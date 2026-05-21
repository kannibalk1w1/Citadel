import type { CanvasItem } from '../../../types'

export type ItemMove = { id: string; x: number; y: number }

const DEFAULT_GAP = 24

export function autoArrangeGrid(items: CanvasItem[], gap = DEFAULT_GAP): ItemMove[] {
  if (items.length < 2) return []

  const ordered = [...items].sort((a, b) => (a.y - b.y) || (a.x - b.x))
  const minX = Math.min(...ordered.map((item) => item.x))
  const minY = Math.min(...ordered.map((item) => item.y))
  const cellWidth = Math.max(...ordered.map((item) => item.width))
  const cellHeight = Math.max(...ordered.map((item) => item.height))
  const columns = Math.ceil(Math.sqrt(ordered.length))

  return ordered.map((item, index) => ({
    id: item.id,
    x: minX + (index % columns) * (cellWidth + gap),
    y: minY + Math.floor(index / columns) * (cellHeight + gap),
  }))
}
