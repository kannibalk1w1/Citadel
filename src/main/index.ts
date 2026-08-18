import { app, BrowserWindow, shell, protocol, net, globalShortcut } from 'electron'
import { join } from 'path'

// Must be called before app.whenReady() — marks 'local' as a secure scheme
// so the renderer can load local asset files without cross-origin errors.
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } },
])
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { isExternallyOpenable } from './externalLinks'
import { buildMenu } from './menu'
import { initCrashRecovery } from './crashRecovery'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    // Hidden by default; the renderer reveals it on hover, and Alt still works.
    autoHideMenuBar: true,
    frame: true,
    // Electron's native opacity API is a no-op on Linux. A transparent host lets
    // the renderer provide the same overlay fade there; Windows keeps its native
    // framed opacity path.
    transparent: process.platform === 'linux',
    backgroundColor: process.platform === 'linux' ? '#00000000' : '#0f0d0b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true,       // required for YouTube <webview>
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  // Pipe renderer console output to the terminal so errors are visible
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    const tag = ['verbose', 'info', 'warning', 'error'][level] ?? 'log'
    const src = sourceId ? ` (${sourceId.split('/').pop()}:${line})` : ''
    if (level >= 2) console.error(`[renderer:${tag}]${src} ${message}`)
    else if (level === 1) console.log(`[renderer:${tag}]${src} ${message}`)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternallyOpenable(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.citadel.app')

  // Serve local asset files via local:// so the renderer can load them
  // regardless of whether it's running from localhost (dev) or file (prod).
  protocol.handle('local', (request) => {
    const path = request.url.slice('local:///'.length)
    return net.fetch(`file:///${decodeURIComponent(path)}`)
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  buildMenu()

  createWindow()

  initCrashRecovery()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// The click-through escape shortcut is registered globally while it is active;
// leaving it bound after quit would steal the combination from the desktop.
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
