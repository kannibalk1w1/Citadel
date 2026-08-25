import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { stopWindowBounds } from './stopWindowLayout'

/**
 * The Stop control that gets you out of click-through, as its own window.
 *
 * Electron can only ignore the mouse for a whole window. The previous design
 * kept one patch of the main window clickable by polling the cursor and handing
 * the mouse back as it arrived — which cannot work on Wayland, where no client
 * can read the pointer while its window is ignoring mouse events. The reading
 * stayed frozen at wherever the pointer was when the mode turned on, so the
 * panel was never reachable and the mode had no visible way out.
 *
 * A second window that simply never ignores the mouse needs no cursor reading
 * at all, so there is one behaviour on all three platforms.
 */

let stopWindow: BrowserWindow | null = null
// The window the mode actually belongs to. The Stop control can send IPC of its
// own, and a request from it must still act on the main window.
let ownerWindow: BrowserWindow | null = null

/** The window click-through was turned on for, or null when it is off. */
export function stopWindowOwner(): BrowserWindow | null {
  return ownerWindow && !ownerWindow.isDestroyed() ? ownerWindow : null
}

/** The Stop control itself, or null when it is closed. */
export function stopWindowInstance(): BrowserWindow | null {
  return stopWindow && !stopWindow.isDestroyed() ? stopWindow : null
}

/** Whether a window is the Stop control rather than something the mode applies to. */
export function isStopWindow(win: BrowserWindow | null | undefined): boolean {
  return Boolean(win && stopWindow && !stopWindow.isDestroyed() && win.id === stopWindow.id)
}

export function closeStopWindow(): void {
  if (stopWindow && !stopWindow.isDestroyed()) stopWindow.destroy()
  stopWindow = null
  ownerWindow = null
}

export function isStopWindowOpen(): boolean {
  return Boolean(stopWindow && !stopWindow.isDestroyed())
}

/**
 * Opens the control on whichever display the given window is on. Safe to call
 * when it is already open — the mode can be re-applied without flicker.
 */
export function openStopWindow(owner: BrowserWindow, rendererUrl?: string): BrowserWindow {
  ownerWindow = owner
  if (isStopWindowOpen()) return stopWindow!

  const display = screen.getDisplayMatching(owner.getBounds())
  const bounds = stopWindowBounds(display.workArea)

  stopWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    // Above the click-through window, and out of the way of the task switcher:
    // this is a transient control, not a second app.
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
    // Never takes focus from whatever the user is actually working in — that is
    // the entire point of click-through — but it must still accept a click.
    focusable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Above full-screen windows too, or working over a maximised app hides the
  // one control that ends the mode.
  stopWindow.setAlwaysOnTop(true, 'screen-saver')
  stopWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (rendererUrl) void stopWindow.loadURL(new URL('stop.html', rendererUrl).toString())
  else void stopWindow.loadFile(join(__dirname, '../renderer/stop.html'))

  stopWindow.once('ready-to-show', () => {
    if (stopWindow && !stopWindow.isDestroyed()) stopWindow.showInactive()
  })
  stopWindow.on('closed', () => { stopWindow = null })

  return stopWindow
}
