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
  const scale = Math.max(viewport.scale, 0.0001)
  return {
    x: (-viewport.x - overscanPx) / scale,
    y: (-viewport.y - overscanPx) / scale,
    width: (screen.width + overscanPx * 2) / scale,
    height: (screen.height + overscanPx * 2) / scale,
  }
}

function itemBounds(item: Pick<CanvasItem, 'x' | 'y' | 'width' | 'height'>): CanvasBounds {
  return {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
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
    .filter((item) => item.visible && (alwaysInclude.has(item.id) || intersects(itemBounds(item), bounds)))
    .map((item) => item.id)
}
