// Window mode rules, kept free of electron so they can be tested directly.
//
// Three modes, and two invariants that keep the window recoverable:
//
//   - Click-through only makes sense on top of other windows, so enabling it
//     enables always-on-top.
//   - Dropping always-on-top drops click-through with it, otherwise the user is
//     left with a window that ignores the mouse and sits behind everything.
//
// Opacity has a floor. A window at 0 opacity cannot be found again.

export const MIN_WINDOW_OPACITY = 0.3
export const MAX_WINDOW_OPACITY = 1

// Registered only while click-through is on: it is the way back out, since by
// definition no click can reach the window itself.
export const CLICK_THROUGH_SHORTCUT = 'CommandOrControl+Alt+C'

export type WindowModeState = {
  alwaysOnTop: boolean
  opacity: number
  clickThrough: boolean
}

export type WindowModeRequest = Partial<WindowModeState>

export const defaultWindowMode: WindowModeState = {
  alwaysOnTop: false,
  opacity: MAX_WINDOW_OPACITY,
  clickThrough: false,
}

// Electron exposes BrowserWindow#setOpacity on every platform, but documents it
// as a no-op on Linux. Linux windows use a transparent host plus renderer alpha
// instead, while Windows and macOS retain the native (whole-window) path.
export function usesRendererOpacityFallback(platform: string): boolean {
  return platform === 'linux'
}

export function clampOpacity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return MAX_WINDOW_OPACITY
  return Math.min(MAX_WINDOW_OPACITY, Math.max(MIN_WINDOW_OPACITY, value))
}

export function nextWindowMode(current: WindowModeState, request: WindowModeRequest): WindowModeState {
  const next: WindowModeState = {
    alwaysOnTop: request.alwaysOnTop ?? current.alwaysOnTop,
    opacity: request.opacity === undefined ? current.opacity : clampOpacity(request.opacity),
    clickThrough: request.clickThrough ?? current.clickThrough,
  }

  // An explicit "stop staying on top" wins over the implication below, so the
  // safe direction always wins when a caller asks for both at once.
  if (request.alwaysOnTop === false) {
    next.alwaysOnTop = false
    next.clickThrough = false
  } else if (next.clickThrough) {
    next.alwaysOnTop = true
  }

  if (!next.alwaysOnTop) next.clickThrough = false

  return next
}
