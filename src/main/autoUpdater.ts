import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

/**
 * Deliberately not called. `src/main/index.ts` does not run this, and
 * autoUpdater.test.ts fails if it starts.
 *
 * Until 2026-08-18 it ran five seconds after every launch against a build with
 * no `publish` target declared, so the check could only ever fail — and the
 * renderer listened for neither `updater:available` nor `updater:downloaded`,
 * so a check that somehow succeeded would have told the user nothing. A paid,
 * offline-first app making a doomed outbound request on every launch is the
 * worst of both: no updates, and a network call to explain.
 *
 * Turning it back on is three things, not one:
 *   1. a `publish` provider in package.json's build config, so a real feed
 *      exists and the release build emits latest.yml;
 *   2. renderer handling for both events, so an available update is something
 *      the user is told about rather than a silent download;
 *   3. code signing, because an unsigned auto-update is a warning dialog the
 *      buyer has to click through every time.
 *
 * The first of those depends on whether release binaries are public at all,
 * which is the licence decision. Until then, updates are manual downloads and
 * the store listing has to say so.
 */

export function initAutoUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = false

  autoUpdater.on('update-available', () => {
    win.webContents.send('updater:available')
  })

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('updater:downloaded')
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
  })

  // Check for updates 5 seconds after launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => { /* ignore in dev */ })
  }, 5000)
}
