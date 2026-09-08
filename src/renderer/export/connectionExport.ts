import type { CanvasItem, Connection, Viewport } from '../../types'
import { connectionGeometry } from '../canvas/overlays/connectionGeometry'
import { connectionLabelPlaque } from '../canvas/overlays/connectionViewModel'
import { canvasColor, canvasFont } from '../theme/canvasColors'

/** Paint relationships above the item bitmap, as the SVG layer does live. */
export function paintConnectionsForExport(
  ctx: CanvasRenderingContext2D,
  connections: Connection[],
  items: CanvasItem[],
  viewport: Viewport,
  pixelRatio: number,
): void {
  const byId = new Map(items.filter((item) => item.visible).map((item) => [item.id, item]))
  ctx.save()
  ctx.scale(pixelRatio, pixelRatio)
  for (const conn of connections) {
    const fromItem = byId.get(conn.fromId)
    const toItem = byId.get(conn.toId)
    if (!fromItem || !toItem) continue
    const { from, to, d, angle } = connectionGeometry(conn, fromItem, toItem, viewport)
    ctx.strokeStyle = conn.color
    ctx.fillStyle = conn.color
    ctx.lineWidth = conn.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash(conn.dashed ? [8, 4] : [])
    ctx.stroke(new Path2D(d))
    ctx.setLineDash([])
    if (conn.arrowHead !== 'none') {
      ctx.save()
      ctx.translate(to.x, to.y)
      ctx.rotate(angle)
      ctx.scale(conn.width, conn.width)
      ctx.beginPath()
      if (conn.arrowHead === 'dot') ctx.arc(0, 0, 3, 0, Math.PI * 2)
      else if (conn.arrowHead === 'diamond') {
        ctx.moveTo(0, -4); ctx.lineTo(4, 0); ctx.lineTo(0, 4); ctx.lineTo(-4, 0)
      } else {
        ctx.moveTo(-6, -3); ctx.lineTo(-6, 3); ctx.lineTo(2, 0)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    const label = conn.label?.trim() || (conn.meaning ? 'Connection' : '')
    if (!label) continue
    const plaque = connectionLabelPlaque(from, to, label, conn.meaning)
    ctx.fillStyle = canvasColor('bgSunken')
    ctx.strokeStyle = canvasColor('border')
    ctx.lineWidth = 1
    ctx.fillRect(plaque.x - plaque.width / 2, plaque.y - plaque.height / 2, plaque.width, plaque.height)
    ctx.strokeRect(plaque.x - plaque.width / 2, plaque.y - plaque.height / 2, plaque.width, plaque.height)
    ctx.fillStyle = canvasColor('textPrimary')
    ctx.font = `600 11px ${canvasFont('body')}`
    ctx.textAlign = 'center'
    ctx.fillText(label.length > 24 ? `${label.slice(0, 23)}...` : label, plaque.textX, plaque.textY)
    if (plaque.badgeText) {
      ctx.fillStyle = canvasColor('accent')
      ctx.font = `700 8px ${canvasFont('mono')}`
      ctx.fillText(plaque.badgeText, plaque.badgeX, plaque.badgeY)
    }
  }
  ctx.restore()
}
