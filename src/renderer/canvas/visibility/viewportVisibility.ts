import type { CanvasItem, Viewport } from '../../../types'

export type ScreenSize = {
  width: number
  height: number
}

export type CanvasBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type VisibleItemOptions = {
  overscanPx?: number
  alwaysIncludeIds?: string[]
}

export function canvasViewportBounds(viewport: Viewport, screen: ScreenSize, overscanPx = 0): CanvasBounds {
  // Fitted exports can legitimately zoom below the interactive zoom floor.
  const scale = Number.isFinite(viewport.scale) && viewport.scale > 0 ? viewport.scale : 0.0001
  return {
    x: (-viewport.x - overscanPx) / scale,
    y: (-viewport.y - overscanPx) / scale,
    width: (screen.width + overscanPx * 2) / scale,
    height: (screen.height + overscanPx * 2) / scale,
  }
}

/**
 * Returns the canvas-space axis-aligned bounds of an item, including the
 * rotation Konva and the DOM layer apply around the item's top-left corner.
 * Keeping this here gives viewport culling and export fitting one geometry
 * contract instead of silently treating rotated relics as unrotated.
 */
export function itemCanvasBounds(item: Pick<CanvasItem, 'x' | 'y' | 'width' | 'height' | 'rotation'>): CanvasBounds {
  const radians = (item.rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  // The four corners are expanded inline because this helper runs for every
  // item on every pan/zoom update. Avoiding temporary arrays keeps the culling
  // fix from adding avoidable allocation pressure to that hot path.
  const x0 = item.x
  const y0 = item.y
  const x1 = x0 + item.width * cos
  const y1 = y0 + item.width * sin
  const x2 = x1 - item.height * sin
  const y2 = y1 + item.height * cos
  const x3 = x0 - item.height * sin
  const y3 = y0 + item.height * cos
  const minX = Math.min(x0, x1, x2, x3)
  const minY = Math.min(y0, y1, y2, y3)
  return {
    x: minX,
    y: minY,
    width: Math.max(x0, x1, x2, x3) - minX,
    height: Math.max(y0, y1, y2, y3) - minY,
  }
}

function intersects(a: CanvasBounds, b: CanvasBounds): boolean {
  return a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
}

export function visibleItemIds(
  items: CanvasItem[],
  viewport: Viewport,
  screen: ScreenSize,
  options: VisibleItemOptions = {},
): string[] {
  const bounds = canvasViewportBounds(viewport, screen, options.overscanPx ?? 0)
  const alwaysInclude = new Set(options.alwaysIncludeIds ?? [])
  return items
    .filter((item) => item.visible && (alwaysInclude.has(item.id) || intersects(itemCanvasBounds(item), bounds)))
    .map((item) => item.id)
}
