// Where the click-through Stop control sits, kept free of electron so it can be
// tested directly — the same reason windowModes.ts is.

export type Rect = { x: number; y: number; width: number; height: number }

export const STOP_WINDOW_SIZE = { width: 232, height: 46 }

/** How far the control sits from the corner of the screen it rests in. */
export const STOP_WINDOW_MARGIN = 16

/**
 * Bottom-right of the *work area*, so it clears a taskbar or dock rather than
 * hiding under one — which for the one control that ends click-through would be
 * the same as not having it.
 *
 * Clamped to the work area's own origin so a display smaller than the control
 * still puts it on screen instead of off the top-left.
 */
export function stopWindowBounds(
  workArea: Rect,
  size = STOP_WINDOW_SIZE,
  margin = STOP_WINDOW_MARGIN,
): Rect {
  return {
    x: Math.round(Math.max(workArea.x, workArea.x + workArea.width - size.width - margin)),
    y: Math.round(Math.max(workArea.y, workArea.y + workArea.height - size.height - margin)),
    width: size.width,
    height: size.height,
  }
}

/**
 * Which window a `window:setMode` request acts on.
 *
 * The Stop control is a window of its own and sends IPC of its own, so the
 * sender is not always the window the mode belongs to. Taking the sender at
 * face value made pressing Stop turn the little control click-through and leave
 * the app exactly as it was — the button visibly worked and changed nothing.
 *
 * Generic over anything with an id so it stays free of electron.
 */
export function windowModeTarget<T extends { id: number }>(
  sender: T | null | undefined,
  stopWindow: T | null | undefined,
  owner: T | null | undefined,
): T | null {
  if (sender && stopWindow && sender.id === stopWindow.id) return owner ?? null
  return sender ?? null
}
