import { app, BrowserWindow, shell, protocol, net, globalShortcut, session } from 'electron'
import { join } from 'path'

// Must be called before app.whenReady() — marks 'local' as a secure scheme
// so the renderer can load local asset files without cross-origin errors.
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } },
])
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { isExternallyOpenable } from './externalLinks'
import { isPermissionAllowed } from './permissions'
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

  // ── Permissions ────────────────────────────────────────────────────────────
  // Electron grants everything when no handler is installed. Deny by default
  // and allow only what Citadel does: the microphone for voice memos, writing
  // to the clipboard, and fullscreen for a video item. The YouTube webview runs
  // somebody else's page in this session, so this governs it too.
  const decide = (permission: string, details?: { mediaTypes?: readonly string[]; mediaType?: string }): boolean => {
    const allowed = isPermissionAllowed(permission, details)
    if (!allowed && is.dev) console.log(`[Citadel] refused permission: ${permission}`)
    return allowed
  }

  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
    callback(decide(permission, details as { mediaTypes?: readonly string[] }))
  })

  // The synchronous counterpart, asked before a request is even made.
  session.defaultSession.setPermissionCheckHandler((_contents, permission, _origin, details) => (
    decide(permission, details as { mediaType?: string })
  ))

  // ── Content Security Policy ────────────────────────────────────────────────
  // There was none, which is what Electron's "Insecure Content-Security-Policy"
  // warning in the dev console was telling us. The renderer loads a user's own
  // files, so the policy has to allow the local: protocol and data:/blob: URIs
  // — the bundled example carries its media inline as data URIs — while still
  // shutting the door on anything arriving over the network.
  //
  // Vite's dev server serves modules over http and needs eval for HMR, so the
  // development policy is deliberately looser. The packaged app gets the strict
  // one, and that is the only one a user ever runs under.
  const cspDirectives = (dev: boolean): string => [
    "default-src 'self'",
    dev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'",
    // React sets styles as attributes throughout, which style-src governs.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: local:",
    "media-src 'self' data: blob: local:",
    "font-src 'self' data:",
    dev
      ? "connect-src 'self' data: blob: local: ws: http://localhost:*"
      : "connect-src 'self' data: blob: local:",
    // pdf.js runs its worker from a blob.
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ')

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspDirectives(is.dev)],
      },
    })
  })

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
