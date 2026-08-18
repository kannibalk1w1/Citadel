import type { CanvasItem, Connection, Viewport } from '../../../types'
import { canvasColor } from '../../theme/canvasColors'

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

export type AnchorHandle = {
  side: Connection['fromAnchor']
  x: number
  y: number
}

export type FrameVariant = 'plain' | 'relic' | 'dossier' | 'sketch' | 'evidence'

export type FrameVariantStyle = {
  /** Length of each corner mark, in CSS pixels at 100%. */
  cornerSize: number
  /** Thickness of those marks. A heavier frame has to actually be heavier. */
  cornerThickness: number
  badgeFill: string
  lineOpacity: number
}

const CHROME_GUTTER = 6
const ACTION_STRIP_OFFSET = 22
const ACTION_STRIP_TOP_MIN = 12
const CONNECTION_TOOLBAR_OFFSET = 28

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

// Multi-selection variant: the strip floats above the gutter-padded union of
// the selected relics; a single item degrades to the same placement rule.
export function selectedActionStripPositionForSelection(items: CanvasItem[], viewport: Viewport): ScreenPosition | null {
  const bounds = selectionBounds(items)
  if (!bounds) return null
  const centerX = (bounds.x + bounds.width / 2) * viewport.scale + viewport.x
  const top = Math.max(ACTION_STRIP_TOP_MIN, bounds.y * viewport.scale + viewport.y - ACTION_STRIP_OFFSET)
  return {
    left: Math.round(centerX),
    top: Math.round(top),
    transform: 'translateX(-50%)',
  }
}

export function itemTypeBadge(item: CanvasItem): string {
  switch (item.type) {
    case 'image': return 'IMG'
    case 'gif': return 'GIF'
    case 'video': return 'VID'
    case 'youtube': return 'YT'
    case 'audio': return 'AUD'
    case 'model3d': return '3D'
    case 'text': return 'TXT'
    case 'sticky': return item.meta?.kind === 'comment' ? 'NOTE' : 'PIN'
    case 'comparison': return 'A/B'
    case 'swatch': return 'PAL'
    default: return 'ITEM'
  }
}

export function frameVariant(item: CanvasItem): FrameVariant {
  const value = item.meta?.frameVariant
  if (value === 'plain' || value === 'relic' || value === 'dossier' || value === 'sketch' || value === 'evidence') return value
  if (item.type === 'sticky' || item.type === 'text') return 'dossier'
  if (item.type === 'model3d' || item.type === 'audio' || item.type === 'video' || item.type === 'youtube') return 'relic'
  return 'plain'
}

/**
 * How each frame actually looks.
 *
 * These used to differ by 1px of corner length and two or three units of an
 * already near-black badge fill — `#14110d` against `#120f0b` — so choosing a
 * frame changed nothing anybody could see, and the colours were leftovers from
 * the warm palette the app no longer uses. The spread below is deliberately
 * wide enough to read at a glance, and the fills come from theme tokens so they
 * hold up in both themes rather than only against the old brown canvas.
 *
 * The order is a progression from quietest to loudest, which is the only thing
 * the five names have ever really meant.
 */
export function frameVariantStyle(variant: FrameVariant): FrameVariantStyle {
  switch (variant) {
    // Barely there: a hint of a corner, for boards where the items are the point.
    case 'sketch':
      return { cornerSize: 8, cornerThickness: 1, badgeFill: canvasColor('bgSunken'), lineOpacity: 0.3 }
    // A filed document: square, legible, unremarkable.
    case 'dossier':
      return { cornerSize: 14, cornerThickness: 2, badgeFill: canvasColor('bgPanel'), lineOpacity: 0.62 }
    // Flagged for attention.
    case 'evidence':
      return { cornerSize: 18, cornerThickness: 2, badgeFill: canvasColor('accentDanger'), lineOpacity: 0.8 }
    // The heaviest, and the only one that borrows the accent.
    case 'relic':
      return { cornerSize: 24, cornerThickness: 3, badgeFill: canvasColor('accent'), lineOpacity: 0.95 }
    default:
      return { cornerSize: 10, cornerThickness: 1, badgeFill: canvasColor('bgPanel'), lineOpacity: 0.45 }
  }
}

export function anchorHandles(item: CanvasItem): AnchorHandle[] {
  const cx = item.x + item.width / 2
  const cy = item.y + item.height / 2
  return [
    { side: 'top', x: cx, y: item.y },
    { side: 'right', x: item.x + item.width, y: cy },
    { side: 'bottom', x: cx, y: item.y + item.height },
    { side: 'left', x: item.x, y: cy },
  ]
}

export function connectedItemIds(itemId: string, connections: Connection[]): Set<string> {
  const related = new Set<string>()
  for (const connection of connections) {
    if (connection.fromId === itemId) related.add(connection.toId)
    if (connection.toId === itemId) related.add(connection.fromId)
  }
  return related
}

export function connectionQuickToolbarPosition(from: { x: number; y: number }, to: { x: number; y: number }): ScreenPosition {
  return {
    left: Math.round((from.x + to.x) / 2),
    top: Math.max(ACTION_STRIP_TOP_MIN, Math.round((from.y + to.y) / 2 - CONNECTION_TOOLBAR_OFFSET)),
    transform: 'translateX(-50%)',
  }
}

export function mediaPlaceholderLabel(item: CanvasItem): string | null {
  if (item.src) return null
  switch (item.type) {
    case 'model3d': return '3D file missing'
    case 'video': return 'Video source missing'
    case 'youtube': return 'YouTube source missing'
    case 'audio': return 'Audio source missing'
    default: return null
  }
}
