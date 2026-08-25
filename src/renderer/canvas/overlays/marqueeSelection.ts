import type { CanvasItem, Viewport } from '../../../types'

export type MarqueeRect = { x: number; y: number; width: number; height: number }

/**
 * How far the pointer must travel before a press on empty ground counts as a
 * marquee rather than a click. Without it every deselecting click would end by
 * selecting whatever a one-pixel rectangle happened to touch.
 */
export const MARQUEE_THRESHOLD_PX = 4

/** A drag from anchor to cursor, normalised so either direction works. */
export function marqueeRect(
  anchor: { x: number; y: number },
  cursor: { x: number; y: number },
): MarqueeRect {
  return {
    x: Math.min(anchor.x, cursor.x),
    y: Math.min(anchor.y, cursor.y),
    width: Math.abs(cursor.x - anchor.x),
    height: Math.abs(cursor.y - anchor.y),
  }
}

/** Whether the drag has travelled far enough, measured on screen not on canvas. */
export function marqueeIsLive(rect: MarqueeRect, viewport: Viewport): boolean {
  return Math.max(rect.width, rect.height) * viewport.scale >= MARQUEE_THRESHOLD_PX
}

/**
 * Everything the rectangle touches, the way every other canvas tool works —
 * the freehand lasso asks for an item's centre, which is right for a shape
 * drawn around things but wrong for a band swept across them.
 *
 * Locked and hidden relics are skipped: a marquee is a coarse gesture, and
 * sweeping one over a locked backdrop would otherwise pick it up every time.
 */
export function itemsInMarquee(items: readonly CanvasItem[], rect: MarqueeRect): string[] {
  return items
    .filter((item) => (
      item.visible
      && !item.locked
      && item.x < rect.x + rect.width
      && item.x + item.width > rect.x
      && item.y < rect.y + rect.height
      && item.y + item.height > rect.y
    ))
    .map((item) => item.id)
}

let sweptSelection = false

/** Records that a sweep, not a click, is what just ended on the Stage. */
export function markMarqueeSweep(): void {
  sweptSelection = true
}

/**
 * True once, for the `click` Konva reports when a sweep is released — mousedown
 * and mouseup both landed on the Stage, so it looks exactly like a click on
 * empty ground, and the Stage's handler would clear the selection the sweep had
 * just made. Cleared on the next press so a stale flag can never eat a real one.
 */
export function consumeMarqueeSweep(): boolean {
  if (!sweptSelection) return false
  sweptSelection = false
  return true
}
