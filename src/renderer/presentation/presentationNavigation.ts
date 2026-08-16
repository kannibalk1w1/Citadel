import type { CanvasItem, Viewport } from '../../types'

const MIN_SCALE = 0.05
const MAX_SCALE = 20
/** Breathing room around a focused item, in screen pixels. */
const FOCUS_PADDING = 160
/** However small the item, never magnify past this — a thumbnail should not fill a wall. */
const FOCUS_MAX_SCALE = 2.5

/**
 * The viewport that puts one item in the middle of the screen, as large as it
 * can be without crowding the edges. Pure so both presentation stepping and
 * study sessions can use it, and so it can be tested without a window.
 */
export function focusViewportFor(
  item: Pick<CanvasItem, 'x' | 'y' | 'width' | 'height'>,
  screen: { width: number; height: number },
): Viewport {
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, Math.min(
      (screen.width - FOCUS_PADDING) / Math.max(1, item.width),
      (screen.height - FOCUS_PADDING) / Math.max(1, item.height),
      FOCUS_MAX_SCALE,
    )),
  )
  return {
    scale,
    x: screen.width / 2 - (item.x + item.width / 2) * scale,
    y: screen.height / 2 - (item.y + item.height / 2) * scale,
  }
}

function presentationOrder(item: CanvasItem): number | null {
  const value = item.meta?.presentationOrder
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function orderedPresentationItems(items: CanvasItem[]): CanvasItem[] {
  return items
    .filter((item) => item.visible !== false && item.meta?.skipPresentation !== true)
    .sort((a, b) => {
      const orderA = presentationOrder(a)
      const orderB = presentationOrder(b)
      if (orderA !== null || orderB !== null) {
        if (orderA === null) return 1
        if (orderB === null) return -1
        return (orderA - orderB) || (a.y - b.y) || (a.x - b.x) || (a.zIndex - b.zIndex)
      }
      return (a.y - b.y) || (a.x - b.x) || (a.zIndex - b.zIndex)
    })
}

export function nextPresentationIndex(items: CanvasItem[], currentId: string | null, direction: 1 | -1): number {
  const ordered = orderedPresentationItems(items)
  if (ordered.length === 0) return direction === 1 ? 0 : -1
  if (!currentId) return direction === 1 ? 0 : ordered.length - 1
  const currentIndex = ordered.findIndex((item) => item.id === currentId)
  if (currentIndex === -1) return direction === 1 ? 0 : ordered.length - 1
  return currentIndex + direction
}
