import { Menu, BrowserWindow, app } from 'electron'

export function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => send('menu:newProject') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => send('menu:open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('menu:save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:saveAs') },
        { type: 'separator' },
        { label: 'Export PDF…', click: () => send('menu:exportPdf') },
        { label: 'Export Image…', click: () => send('menu:exportImage') },
        { label: 'Export Archive…', click: () => send('menu:exportZip') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('menu:undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => send('menu:redo') },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => send('menu:cut') },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => send('menu:copy') },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => send('menu:paste') },
        { type: 'separator' },
        { label: 'Duplicate', accelerator: 'CmdOrCtrl+D', click: () => send('menu:duplicate') },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => send('menu:selectAll') },
        { label: 'Delete', accelerator: 'Delete', click: () => send('menu:delete') },
      ],
    },
    {
      label: 'Board',
      submenu: [
        { label: 'New Board', accelerator: 'CmdOrCtrl+Shift+N', click: () => send('menu:boardNew') },
        { label: 'Next Board', accelerator: 'CmdOrCtrl+PageDown', click: () => send('menu:boardNext') },
        { label: 'Previous Board', accelerator: 'CmdOrCtrl+PageUp', click: () => send('menu:boardPrev') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Equal', click: () => send('menu:zoomIn') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+Minus', click: () => send('menu:zoomOut') },
        { label: 'Fit Canvas', accelerator: 'CmdOrCtrl+0', click: () => send('menu:zoomFit') },
        { type: 'separator' },
        { label: 'Toggle Recording', accelerator: 'CmdOrCtrl+R', click: () => send('menu:recordToggle') },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'reload' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: `Citadel v${app.getVersion()}`, enabled: false },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function send(channel: string): void {
  const win = BrowserWindow.getFocusedWindow()
  win?.webContents.send(channel)
}
