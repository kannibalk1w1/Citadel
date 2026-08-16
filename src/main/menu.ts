import { Menu, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { readSettingsFile } from './settingsStore'

export function buildMenu(): void {
  const overrides = readSettingsFile(join(app.getPath('userData'), 'keybinds.json'))
  const accelerator = (action: string, fallback: string): string | undefined => {
    const candidate = overrides[action]
    const combo = Array.isArray(candidate) ? candidate.find((value): value is string => typeof value === 'string') : undefined
    // An empty override is an intentional unbind; malformed data falls back to
    // the safe default and will be normalized by the renderer on startup.
    if (Array.isArray(candidate) && candidate.length === 0) return undefined
    return toElectronAccelerator(combo ?? fallback)
  }
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: accelerator('file:new', 'ctrl+n'), click: () => send('menu:newProject') },
        { label: 'Open…', accelerator: accelerator('file:open', 'ctrl+o'), click: () => send('menu:open') },
        { type: 'separator' },
        { label: 'Save', accelerator: accelerator('file:save', 'ctrl+s'), click: () => send('menu:save') },
        { label: 'Save As…', accelerator: accelerator('file:saveAs', 'ctrl+shift+s'), click: () => send('menu:saveAs') },
        { type: 'separator' },
        { label: 'Export PDF…', click: () => send('menu:exportPdf') },
        { label: 'Export Image…', click: () => send('menu:exportImage') },
        { label: 'Export Archive (.citadelz)…', click: () => send('menu:exportZip') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: accelerator('edit:undo', 'ctrl+z'), click: () => send('menu:undo') },
        { label: 'Redo', accelerator: accelerator('edit:redo', 'ctrl+shift+z'), click: () => send('menu:redo') },
        { type: 'separator' },
        { label: 'Cut', accelerator: accelerator('edit:cut', 'ctrl+x'), click: () => send('menu:cut') },
        { label: 'Copy', accelerator: accelerator('edit:copy', 'ctrl+c'), click: () => send('menu:copy') },
        { label: 'Paste', accelerator: accelerator('edit:paste', 'ctrl+v'), click: () => send('menu:paste') },
        { type: 'separator' },
        { label: 'Duplicate', accelerator: accelerator('edit:duplicate', 'ctrl+d'), click: () => send('menu:duplicate') },
        { label: 'Select All', accelerator: accelerator('edit:selectAll', 'ctrl+a'), click: () => send('menu:selectAll') },
        { label: 'Delete', accelerator: accelerator('edit:delete', 'delete'), click: () => send('menu:delete') },
      ],
    },
    {
      label: 'Board',
      submenu: [
        { label: 'New Board', accelerator: accelerator('board:new', 'ctrl+shift+n'), click: () => send('menu:boardNew') },
        { label: 'Duplicate Board', accelerator: accelerator('board:duplicate', 'ctrl+shift+d'), click: () => send('menu:boardDuplicate') },
        { label: 'Next Board', accelerator: accelerator('board:next', 'ctrl+pagedown'), click: () => send('menu:boardNext') },
        { label: 'Previous Board', accelerator: accelerator('board:prev', 'ctrl+pageup'), click: () => send('menu:boardPrev') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: accelerator('viewport:zoomIn', 'ctrl+='), click: () => send('menu:zoomIn') },
        { label: 'Zoom Out', accelerator: accelerator('viewport:zoomOut', 'ctrl+minus'), click: () => send('menu:zoomOut') },
        { label: 'Fit Canvas', accelerator: accelerator('viewport:zoomFit', 'ctrl+0'), click: () => send('menu:zoomFit') },
        { type: 'separator' },
        { label: 'Toggle Recording', accelerator: accelerator('record:toggle', 'ctrl+r'), click: () => send('menu:recordToggle') },
        { type: 'separator' },
        { label: 'Always on Top', accelerator: accelerator('window:alwaysOnTopToggle', 'ctrl+alt+t'), click: () => send('menu:alwaysOnTopToggle') },
        { label: 'Click Through', accelerator: accelerator('window:clickThroughToggle', 'ctrl+alt+c'), click: () => send('menu:clickThroughToggle') },
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

export function toElectronAccelerator(combo: string): string | undefined {
  const parts = combo.toLowerCase().split('+')
  const key = parts.pop()
  if (!key) return undefined
  const modifier = { ctrl: 'Ctrl', meta: 'Command', alt: 'Alt', shift: 'Shift' } as const
  const namedKey: Record<string, string> = {
    space: 'Space', plus: 'Plus', minus: 'Minus', '=': 'Equal', pagedown: 'PageDown', pageup: 'PageUp',
    arrowup: 'Up', arrowdown: 'Down', arrowleft: 'Left', arrowright: 'Right',
  }
  if (!parts.every((part) => part in modifier)) return undefined
  return [...parts.map((part) => modifier[part as keyof typeof modifier]), namedKey[key] ?? key.toUpperCase()].join('+')
}

function send(channel: string): void {
  const win = BrowserWindow.getFocusedWindow()
  win?.webContents.send(channel)
}
