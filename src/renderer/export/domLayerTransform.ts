/**
 * Rotation for the DOM-layer export painters.
 *
 * DOM-layer items are rotated by CSS on the live board — `DOMItem` sets
 * `transform: rotate(...)` with `transform-origin: top left`. The export
 * repaints those items with the 2D context instead of capturing them, so it has
 * to reproduce that rotation itself; without it a rotated code card, video or
 * 3D item came out axis-aligned and overlapped the neighbours it had been
 * placed around. Konva items were never affected, so a mixed board exported
 * inconsistently.
 *
 * Kept in its own module because both painters need it and each is imported by
 * `domLayerExport`, so neither can own it without a cycle.
 */

/** The top-left origin `DOMItem` rotates about, in destination pixels. */
export type RotationOrigin = { x: number; y: number }

export function applyItemRotation(
  ctx: CanvasRenderingContext2D,
  degrees: number,
  origin: RotationOrigin,
): void {
  if (!Number.isFinite(degrees) || degrees === 0) return
  ctx.translate(origin.x, origin.y)
  ctx.rotate((degrees * Math.PI) / 180)
  ctx.translate(-origin.x, -origin.y)
}

/** Normalizes a stored rotation, which older archives may omit entirely. */
export function itemRotation(rotation: unknown): number {
  return typeof rotation === 'number' && Number.isFinite(rotation) ? rotation : 0
}
