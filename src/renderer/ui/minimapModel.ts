import type { CanvasItem, Viewport } from '../../types'

export type MinimapTransform = {
  scale: number
  ox: number
  oy: number
}

export type MinimapRect = {
  x: number
  y: number
  width: number
  height: number
}

export type MinimapItemRect = MinimapRect & {
  id: string
  type: CanvasItem['type']
  selected: boolean
}

export type MinimapModel = {
  transform: MinimapTransform
  items: MinimapItemRect[]
  viewport: MinimapRect
}

const PADDING_RATIO = 0.85

export function minimapToCanvas(x: number, y: number, transform: MinimapTransform): { x: number; y: number } {
  return {
    x: (x - transform.ox) / transform.scale,
    y: (y - transform.oy) / transform.scale,
  }
}

export function buildMinimapModel(
  items: CanvasItem[],
  viewport: Viewport,
  selectedIds: string[],
  mapWidth: number,
  mapHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): MinimapModel {
  if (items.length === 0) {
    return {
      transform: { scale: 1, ox: 0, oy: 0 },
      items: [],
      viewport: { x: 0, y: 0, width: mapWidth, height: mapHeight },
    }
  }

  const allX = items.flatMap((item) => [item.x, item.x + item.width])
  const allY = items.flatMap((item) => [item.y, item.y + item.height])
  const minX = Math.min(...allX)
  const maxX = Math.max(...allX)
  const minY = Math.min(...allY)
  const maxY = Math.max(...allY)
  const sceneW = maxX - minX || 1
  const sceneH = maxY - minY || 1
  const scale = Math.min(mapWidth / sceneW, mapHeight / sceneH) * PADDING_RATIO
  const ox = (mapWidth - sceneW * scale) / 2 - minX * scale
  const oy = (mapHeight - sceneH * scale) / 2 - minY * scale
  const selected = new Set(selectedIds)

  return {
    transform: { scale, ox, oy },
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      selected: selected.has(item.id),
      x: item.x * scale + ox,
      y: item.y * scale + oy,
      width: Math.max(1, item.width * scale),
      height: Math.max(1, item.height * scale),
    })),
    viewport: {
      x: (-viewport.x / viewport.scale) * scale + ox,
      y: (-viewport.y / viewport.scale) * scale + oy,
      width: (canvasWidth / viewport.scale) * scale,
      height: (canvasHeight / viewport.scale) * scale,
    },
  }
}

export function containsRectPoint(rect: MinimapRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

export function viewportForMinimapCenter(
  minimapX: number,
  minimapY: number,
  transform: MinimapTransform,
  viewportScale: number,
  canvasWidth: number,
  canvasHeight: number,
): Pick<Viewport, 'x' | 'y'> {
  const point = minimapToCanvas(minimapX, minimapY, transform)
  return {
    x: canvasWidth / 2 - point.x * viewportScale,
    y: canvasHeight / 2 - point.y * viewportScale,
  }
}

export function viewportForMinimapDrag(
  startViewport: Viewport,
  deltaMapX: number,
  deltaMapY: number,
  transform: MinimapTransform,
): Pick<Viewport, 'x' | 'y'> {
  return {
    x: startViewport.x - (deltaMapX / transform.scale) * startViewport.scale,
    y: startViewport.y - (deltaMapY / transform.scale) * startViewport.scale,
  }
}
