import type { CanvasItem, Viewport } from '../../../types'

export type ChromeFrameStyle = {
  stroke: string
  strokeWidth: number
  dash?: number[]
  glowOpacity: number
}

export type ScreenPosition = {
  left: number
  top: number
  transform: string
}

export type CanvasBounds = {
  x: number
  y: number
  width: number
  height: number
}

const CHROME_GUTTER = 6
const ACTION_STRIP_OFFSET = 22
const ACTION_STRIP_TOP_MIN = 12

export function chromeFrameStyle({ selected, locked }: { selected: boolean; locked: boolean }): ChromeFrameStyle {
  if (locked) {
    return {
      stroke: 'var(--text-muted)',
      strokeWidth: selected ? 1.25 : 1,
      dash: [6, 4],
      glowOpacity: selected ? 0.1 : 0,
    }
  }
  if (selected) {
    return {
      stroke: 'var(--accent)',
      strokeWidth: 1.5,
      dash: undefined,
      glowOpacity: 0.22,
    }
  }
  return {
    stroke: 'rgba(189, 150, 82, 0.34)',
    strokeWidth: 1,
    dash: undefined,
    glowOpacity: 0,
  }
}

export function selectionBounds(items: CanvasItem[]): CanvasBounds | null {
  if (items.length === 0) return null
  const minX = Math.min(...items.map((item) => item.x))
  const minY = Math.min(...items.map((item) => item.y))
  const maxX = Math.max(...items.map((item) => item.x + item.width))
  const maxY = Math.max(...items.map((item) => item.y + item.height))
  return {
    x: minX - CHROME_GUTTER,
    y: minY - CHROME_GUTTER,
    width: maxX - minX + CHROME_GUTTER * 2,
    height: maxY - minY + CHROME_GUTTER * 2,
  }
}

export function selectedActionStripPosition(item: CanvasItem, viewport: Viewport): ScreenPosition {
  const centerX = (item.x + item.width / 2) * viewport.scale + viewport.x
  const top = Math.max(ACTION_STRIP_TOP_MIN, item.y * viewport.scale + viewport.y - ACTION_STRIP_OFFSET)
  return {
    left: Math.round(centerX),
    top: Math.round(top),
    transform: 'translateX(-50%)',
  }
}

