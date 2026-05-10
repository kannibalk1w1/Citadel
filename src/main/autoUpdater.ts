import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

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
