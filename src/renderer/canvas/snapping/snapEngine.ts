import type { CanvasItem, Viewport } from '../../../types'
import { spatialIndex } from './spatialIndex'
import { snapLines } from '../overlays/SnapGuides'
import { useUIStore } from '../../store/uiStore'

const SNAP_THRESHOLD_SCREEN = 8  // px

type SnapResult = { x: number; y: number }

export function snapItem(
  dragged: CanvasItem,
  allItems: CanvasItem[],
  viewport: Viewport
): SnapResult {
  const { snapToGrid, gridSize } = useUIStore.getState()
  const threshold = SNAP_THRESHOLD_SCREEN / viewport.scale

  // Candidates from spatial index (nearby items only)
  const candidates = spatialIndex
    .query(dragged.x - threshold * 4, dragged.y - threshold * 4, dragged.width + threshold * 8, dragged.height + threshold * 8)
    .filter((i) => i.id !== dragged.id)

  // Clear previous guides
  snapLines.length = 0

  let snappedX = dragged.x
  let snappedY = dragged.y

  for (const target of candidates) {
    // Edges to compare
    const dragEdges = {
      left: dragged.x,
      right: dragged.x + dragged.width,
      centerX: dragged.x + dragged.width / 2,
      top: dragged.y,
      bottom: dragged.y + dragged.height,
      centerY: dragged.y + dragged.height / 2,
    }
    const targetEdges = {
      left: target.x,
      right: target.x + target.width,
      centerX: target.x + target.width / 2,
      top: target.y,
      bottom: target.y + target.height,
      centerY: target.y + target.height / 2,
    }

    // X snaps
    for (const [dk, tv] of [
      ['left', targetEdges.left], ['left', targetEdges.right],
      ['right', targetEdges.left], ['right', targetEdges.right],
      ['centerX', targetEdges.centerX],
    ] as [keyof typeof dragEdges, number][]) {
      const delta = tv - dragEdges[dk]
      if (Math.abs(delta) < threshold) {
        snappedX = dragged.x + delta
        snapLines.push({ x1: tv, y1: Math.min(dragged.y, target.y) - 20, x2: tv, y2: Math.max(dragged.y + dragged.height, target.y + target.height) + 20 })
        break
      }
    }

    // Y snaps
    for (const [dk, tv] of [
      ['top', targetEdges.top], ['top', targetEdges.bottom],
      ['bottom', targetEdges.top], ['bottom', targetEdges.bottom],
      ['centerY', targetEdges.centerY],
    ] as [keyof typeof dragEdges, number][]) {
      const delta = tv - dragEdges[dk]
      if (Math.abs(delta) < threshold) {
        snappedY = dragged.y + delta
        snapLines.push({ x1: Math.min(dragged.x, target.x) - 20, y1: tv, x2: Math.max(dragged.x + dragged.width, target.x + target.width) + 20, y2: tv })
        break
      }
    }
  }

  // ── Grid snap ────────────────────────────────────────────────────────────────
  if (snapToGrid) {
    const gridSnappedX = Math.round(snappedX / gridSize) * gridSize
    const gridSnappedY = Math.round(snappedY / gridSize) * gridSize
    if (Math.abs(gridSnappedX - snappedX) < threshold) snappedX = gridSnappedX
    if (Math.abs(gridSnappedY - snappedY) < threshold) snappedY = gridSnappedY
  }

  return { x: snappedX, y: snappedY }
}
