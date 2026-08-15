import type { CanvasItem, Viewport } from '../../../types'
import { spatialIndex } from './spatialIndex'
import { snapLines, type SnapLine } from '../overlays/SnapGuides'
import { useUIStore } from '../../store/uiStore'

const SNAP_THRESHOLD_SCREEN = 8  // px

type SnapResult = { x: number; y: number }
type SnapOptions = { invertSnap?: boolean }
type EdgeName = 'left' | 'right' | 'centerX' | 'top' | 'bottom' | 'centerY'
type SnapCandidate = {
  delta: number
  value: number
  target: CanvasItem
  draggedEdge: EdgeName
  targetEdge: EdgeName
}

// Clear space between two items on one axis: 0 when they touch or overlap.
function gapOnAxis(a: CanvasItem, b: CanvasItem, axis: 'x' | 'y'): number {
  const aStart = axis === 'x' ? a.x : a.y
  const aEnd = aStart + (axis === 'x' ? a.width : a.height)
  const bStart = axis === 'x' ? b.x : b.y
  const bEnd = bStart + (axis === 'x' ? b.width : b.height)
  if (bStart >= aEnd) return bStart - aEnd
  if (aStart >= bEnd) return aStart - bEnd
  return 0
}

// What a guide reports: how far apart these two items actually are. Items that
// touch on one axis and overlap on the other read "0 px" — the gapless dock.
function separationLabel(dragged: CanvasItem, candidate: SnapCandidate): string {
  const gap = Math.max(
    gapOnAxis(dragged, candidate.target, 'x'),
    gapOnAxis(dragged, candidate.target, 'y')
  )
  return `${Math.round(gap)} px`
}

function pickClosest(current: SnapCandidate | null, candidate: SnapCandidate, threshold: number): SnapCandidate | null {
  if (Math.abs(candidate.delta) >= threshold) return current
  if (!current || Math.abs(candidate.delta) < Math.abs(current.delta)) return candidate
  return current
}

function verticalGuide(dragged: CanvasItem, candidate: SnapCandidate): SnapLine {
  return {
    x1: candidate.value,
    y1: Math.min(dragged.y, candidate.target.y) - 20,
    x2: candidate.value,
    y2: Math.max(dragged.y + dragged.height, candidate.target.y + candidate.target.height) + 20,
    orientation: 'vertical',
    // Measured where the item will land, not where the pointer left it.
    label: separationLabel({ ...dragged, x: dragged.x + candidate.delta }, candidate),
    labelX: candidate.value + 6,
    labelY: Math.min(dragged.y, candidate.target.y) - 16,
  }
}

function horizontalGuide(dragged: CanvasItem, candidate: SnapCandidate): SnapLine {
  return {
    x1: Math.min(dragged.x, candidate.target.x) - 20,
    y1: candidate.value,
    x2: Math.max(dragged.x + dragged.width, candidate.target.x + candidate.target.width) + 20,
    y2: candidate.value,
    orientation: 'horizontal',
    label: separationLabel({ ...dragged, y: dragged.y + candidate.delta }, candidate),
    labelX: Math.min(dragged.x, candidate.target.x) - 16,
    labelY: candidate.value + 6,
  }
}

// Candidates come from the spatial index, which the drag handlers rebuild on
// drag start — this never needed the full item list.
export function snapItem(
  dragged: CanvasItem,
  viewport: Viewport,
  options: SnapOptions = {}
): SnapResult {
  const { snapToGrid, gridSize } = useUIStore.getState()
  const snapActive = options.invertSnap ? !snapToGrid : snapToGrid
  const threshold = SNAP_THRESHOLD_SCREEN / viewport.scale

  // Candidates from spatial index (nearby items only)
  const candidates = spatialIndex
    .query(dragged.x - threshold * 4, dragged.y - threshold * 4, dragged.width + threshold * 8, dragged.height + threshold * 8)
    .filter((i) => i.id !== dragged.id)

  // Clear previous guides
  snapLines.length = 0

  if (!snapActive) return { x: dragged.x, y: dragged.y }

  let snappedX = dragged.x
  let snappedY = dragged.y
  let bestX: SnapCandidate | null = null
  let bestY: SnapCandidate | null = null

  const dragEdges = {
    left: dragged.x,
    right: dragged.x + dragged.width,
    centerX: dragged.x + dragged.width / 2,
    top: dragged.y,
    bottom: dragged.y + dragged.height,
    centerY: dragged.y + dragged.height / 2,
  }

  for (const target of candidates) {
    const targetEdges = {
      left: target.x,
      right: target.x + target.width,
      centerX: target.x + target.width / 2,
      top: target.y,
      bottom: target.y + target.height,
      centerY: target.y + target.height / 2,
    }

    for (const [draggedEdge, targetEdge, value] of [
      ['left', 'left', targetEdges.left],
      ['left', 'right', targetEdges.right],
      ['right', 'left', targetEdges.left],
      ['right', 'right', targetEdges.right],
      ['centerX', 'centerX', targetEdges.centerX],
    ] as [EdgeName, EdgeName, number][]) {
      bestX = pickClosest(bestX, { delta: value - dragEdges[draggedEdge], value, target, draggedEdge, targetEdge }, threshold)
    }

    for (const [draggedEdge, targetEdge, value] of [
      ['top', 'top', targetEdges.top],
      ['top', 'bottom', targetEdges.bottom],
      ['bottom', 'top', targetEdges.top],
      ['bottom', 'bottom', targetEdges.bottom],
      ['centerY', 'centerY', targetEdges.centerY],
    ] as [EdgeName, EdgeName, number][]) {
      bestY = pickClosest(bestY, { delta: value - dragEdges[draggedEdge], value, target, draggedEdge, targetEdge }, threshold)
    }
  }

  if (snapActive) {
    const gridSnappedX = Math.round(snappedX / gridSize) * gridSize
    const gridSnappedY = Math.round(snappedY / gridSize) * gridSize
    if (Math.abs(gridSnappedX - snappedX) < threshold) snappedX = gridSnappedX
    if (Math.abs(gridSnappedY - snappedY) < threshold) snappedY = gridSnappedY
  }

  if (bestX) {
    snappedX = dragged.x + bestX.delta
    snapLines.push(verticalGuide(dragged, bestX))
  }

  if (bestY) {
    snappedY = dragged.y + bestY.delta
    snapLines.push(horizontalGuide(dragged, bestY))
  }

  return { x: snappedX, y: snappedY }
}
