import type { CanvasItem, Connection, Viewport } from '../../../types'

type Point = { x: number; y: number }

export function closestSide(from: CanvasItem, to: CanvasItem): { fromSide: Connection['fromAnchor']; toSide: Connection['toAnchor'] } {
  const dx = to.x + to.width / 2 - from.x - from.width / 2
  const dy = to.y + to.height / 2 - from.y - from.height / 2
  return Math.abs(dx) > Math.abs(dy)
    ? { fromSide: dx > 0 ? 'right' : 'left', toSide: dx > 0 ? 'left' : 'right' }
    : { fromSide: dy > 0 ? 'bottom' : 'top', toSide: dy > 0 ? 'top' : 'bottom' }
}

function anchorPoint(item: CanvasItem, side: Connection['fromAnchor']): Point {
  const cx = item.x + item.width / 2
  const cy = item.y + item.height / 2
  switch (side) {
    case 'top': return { x: cx, y: item.y }
    case 'bottom': return { x: cx, y: item.y + item.height }
    case 'left': return { x: item.x, y: cy }
    case 'right': return { x: item.x + item.width, y: cy }
    default: return { x: cx, y: cy }
  }
}

/** Geometry shared by the SVG overlay and exported stills. */
export function connectionGeometry(conn: Connection, fromItem: CanvasItem, toItem: CanvasItem, viewport: Viewport) {
  const sides = closestSide(fromItem, toItem)
  const screen = (pt: Point): Point => ({ x: pt.x * viewport.scale + viewport.x, y: pt.y * viewport.scale + viewport.y })
  const from = screen(anchorPoint(fromItem, conn.fromAnchor === 'auto' ? sides.fromSide : conn.fromAnchor))
  const to = screen(anchorPoint(toItem, conn.toAnchor === 'auto' ? sides.toSide : conn.toAnchor))
  const dx = Math.abs(to.x - from.x) * 0.5
  const mx = (from.x + to.x) / 2
  const d = conn.style === 'bezier'
    ? `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`
    : conn.style === 'elbow'
      ? `M ${from.x} ${from.y} L ${mx} ${from.y} L ${mx} ${to.y} L ${to.x} ${to.y}`
      : `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  const tangent = dx === 0 || conn.style === 'straight' ? from
    : { x: conn.style === 'bezier' ? to.x - dx : mx, y: to.y }
  return { from, to, d, angle: Math.atan2(to.y - tangent.y, to.x - tangent.x) }
}
