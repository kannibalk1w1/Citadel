// Keeping one small panel usable while the rest of the window ignores the mouse.
//
// Electron can only ignore the mouse for a whole window, so an interactive
// region has to be simulated: watch where the cursor is, and hand the mouse
// back to the window exactly while it sits over the panel.
//
// The obvious way to do that is `setIgnoreMouseEvents(true, { forward: true })`
// and react to mousemove in the renderer — but `forward` is documented as macOS
// and Windows only, so on Linux no pointer event ever reaches the renderer and
// the panel could never notice the cursor arriving. Polling the cursor from the
// main process is the one approach that behaves the same on all three, so it is
// the only path rather than a fallback: one code path, one behaviour to reason
// about.
//
// Free of electron imports so the geometry can be tested directly.

export type Rect = { x: number; y: number; width: number; height: number }
export type Point = { x: number; y: number }

/**
 * Cursor sampling interval. Fast enough that reaching for the panel feels
 * immediate, slow enough to be nothing on a modern machine, and it only runs
 * while click-through is actually on.
 */
export const CLICK_THROUGH_POLL_MS = 100

/**
 * Renderer CSS pixels to screen coordinates.
 *
 * Content bounds are in device-independent pixels, and so is the cursor point,
 * so the only conversion needed is the renderer's zoom factor — the app's UI
 * scale setting changes CSS pixel size without moving the window.
 */
export function regionToScreenRect(region: Rect, contentBounds: Rect, zoomFactor = 1): Rect {
  const zoom = Number.isFinite(zoomFactor) && zoomFactor > 0 ? zoomFactor : 1
  return {
    x: contentBounds.x + region.x * zoom,
    y: contentBounds.y + region.y * zoom,
    width: region.width * zoom,
    height: region.height * zoom,
  }
}

export function pointInRect(point: Point, rect: Rect): boolean {
  if (rect.width <= 0 || rect.height <= 0) return false
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
}

/**
 * Whether the window should take the mouse back on this tick. False whenever
 * there is no region to protect, which keeps the failure direction safe: the
 * window stays click-through rather than silently swallowing clicks.
 */
export function shouldCaptureMouse(
  cursor: Point,
  contentBounds: Rect,
  region: Rect | null,
  zoomFactor = 1,
): boolean {
  if (!region) return false
  return pointInRect(cursor, regionToScreenRect(region, contentBounds, zoomFactor))
}

/** Rejects malformed rects from the renderer rather than trusting them. */
export function normalizeRegion(value: unknown): Rect | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<Rect>
  const numbers = [candidate.x, candidate.y, candidate.width, candidate.height]
  if (!numbers.every((n) => typeof n === 'number' && Number.isFinite(n))) return null
  if (candidate.width! <= 0 || candidate.height! <= 0) return null
  return { x: candidate.x!, y: candidate.y!, width: candidate.width!, height: candidate.height! }
}
