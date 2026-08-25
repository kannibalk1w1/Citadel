import { Menu, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { readSettingsFile } from './settingsStore'

/**
 * The combo each menu item falls back to when the user has no override, in the
 * renderer's own combo spelling (see `defaultKeybinds`).
 *
 * Exported because it is a second copy of the renderer's defaults and there is
 * no import that can remove it: `src/main` cannot reach `src/renderer` without
 * breaking the project split. `menuAccelerators.test.ts` runs in the renderer
 * project, which can see both, and fails if an entry here drifts from
 * `defaultKeybinds`. That drift is exactly how the menu came to advertise
 * "Ctrl+Minus" for a shortcut the app read as `ctrl+-`.
 */
export const MENU_DEFAULT_ACCELERATORS: Record<string, string> = {
  'file:new': 'ctrl+n',
  'file:open': 'ctrl+o',
  'file:save': 'ctrl+s',
  'file:saveAs': 'ctrl+shift+s',
  'edit:undo': 'ctrl+z',
  'edit:redo': 'ctrl+shift+z',
  'edit:cut': 'ctrl+x',
  'edit:copy': 'ctrl+c',
  'edit:paste': 'ctrl+v',
  'edit:duplicate': 'ctrl+d',
  'edit:selectAll': 'ctrl+a',
  'edit:delete': 'delete',
  'board:new': 'ctrl+shift+n',
  'board:duplicate': 'ctrl+shift+d',
  'board:next': 'ctrl+pagedown',
  'board:prev': 'ctrl+pageup',
  'viewport:zoomIn': 'ctrl+=',
  'viewport:zoomOut': 'ctrl+minus',
  // Not ctrl+0: that is `viewport:zoomReset`. A menu accelerator is claimed
  // before the renderer sees the key, so advertising it here took Ctrl+0 away
  // from Reset Zoom and left that action unreachable.
  'viewport:zoomFit': 'ctrl+shift+h',
  'record:toggle': 'ctrl+r',
  'window:alwaysOnTopToggle': 'ctrl+alt+t',
  'window:clickThroughToggle': 'ctrl+alt+c',
}

export function buildMenu(): void {
  const overrides = readSettingsFile(join(app.getPath('userData'), 'keybinds.json'))
  const accelerator = (action: string): string | undefined => {
    const fallback = MENU_DEFAULT_ACCELERATORS[action]
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
        { label: 'New Project', accelerator: accelerator('file:new'), click: () => send('menu:newProject') },
        { label: 'Open…', accelerator: accelerator('file:open'), click: () => send('menu:open') },
        { type: 'separator' },
        { label: 'Save', accelerator: accelerator('file:save'), click: () => send('menu:save') },
        { label: 'Save As…', accelerator: accelerator('file:saveAs'), click: () => send('menu:saveAs') },
        { type: 'separator' },
        { label: 'Export PDF…', click: () => send('menu:exportPdf') },
        { label: 'Export Image…', click: () => send('menu:exportImage') },
        { label: 'Export Archive (.citadelz)…', click: () => send('menu:exportZip') },
        { label: 'Export Markdown (Obsidian)…', click: () => send('menu:exportMarkdown') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: accelerator('edit:undo'), click: () => send('menu:undo') },
        { label: 'Redo', accelerator: accelerator('edit:redo'), click: () => send('menu:redo') },
        { type: 'separator' },
        { label: 'Cut', accelerator: accelerator('edit:cut'), click: () => send('menu:cut') },
        { label: 'Copy', accelerator: accelerator('edit:copy'), click: () => send('menu:copy') },
        { label: 'Paste', accelerator: accelerator('edit:paste'), click: () => send('menu:paste') },
        { type: 'separator' },
        { label: 'Duplicate', accelerator: accelerator('edit:duplicate'), click: () => send('menu:duplicate') },
        { label: 'Select All', accelerator: accelerator('edit:selectAll'), click: () => send('menu:selectAll') },
        { label: 'Delete', accelerator: accelerator('edit:delete'), click: () => send('menu:delete') },
        { type: 'separator' },
        // No fallback accelerator: the action ships unbound, so this shows a
        // shortcut only once a person has chosen one for it.
        { label: 'Settings', accelerator: accelerator('panel:keybinds'), click: () => send('menu:settings') },
      ],
    },
    {
      label: 'Board',
      submenu: [
        { label: 'New Board', accelerator: accelerator('board:new'), click: () => send('menu:boardNew') },
        { label: 'Duplicate Board', accelerator: accelerator('board:duplicate'), click: () => send('menu:boardDuplicate') },
        { label: 'Next Board', accelerator: accelerator('board:next'), click: () => send('menu:boardNext') },
        { label: 'Previous Board', accelerator: accelerator('board:prev'), click: () => send('menu:boardPrev') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: accelerator('viewport:zoomIn'), click: () => send('menu:zoomIn') },
        { label: 'Zoom Out', accelerator: accelerator('viewport:zoomOut'), click: () => send('menu:zoomOut') },
        { label: 'Fit Canvas', accelerator: accelerator('viewport:zoomFit'), click: () => send('menu:zoomFit') },
        { type: 'separator' },
        { label: 'Toggle Recording', accelerator: accelerator('record:toggle'), click: () => send('menu:recordToggle') },
        { type: 'separator' },
        { label: 'Always on Top', accelerator: accelerator('window:alwaysOnTopToggle'), click: () => send('menu:alwaysOnTopToggle') },
        { label: 'Click Through', accelerator: accelerator('window:clickThroughToggle'), click: () => send('menu:clickThroughToggle') },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        // Explicit, because the role's own default is CmdOrCtrl+R — the same
        // accelerator 'record:toggle' claims a few lines up. Two menu items
        // sharing one accelerator leaves whichever loses silently dead.
        { role: 'reload', accelerator: 'CmdOrCtrl+Shift+R' },
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

/**
 * Citadel's combo spelling to an Electron accelerator.
 *
 * The key names are not interchangeable, and Electron rejects an accelerator it
 * cannot parse rather than warning: `Minus` and `Equal` are *not* in its key
 * list, so "Ctrl+Minus" silently left Zoom Out with no shortcut at all. The
 * punctuation characters are accepted directly, so they are what this emits.
 */
export function toElectronAccelerator(combo: string | undefined): string | undefined {
  if (!combo) return undefined
  const parts = combo.toLowerCase().split('+')
  const key = parts.pop()
  if (!key) return undefined
  const modifier = { ctrl: 'Ctrl', meta: 'Command', alt: 'Alt', shift: 'Shift' } as const
  const namedKey: Record<string, string> = {
    space: 'Space', plus: 'Plus', minus: '-', '=': '=', pagedown: 'PageDown', pageup: 'PageUp',
    arrowup: 'Up', arrowdown: 'Down', arrowleft: 'Left', arrowright: 'Right',
    escape: 'Esc', enter: 'Return', backspace: 'Backspace', delete: 'Delete', tab: 'Tab',
  }
  // A modifiers-only combo has no key to bind; `key` would be a modifier name.
  if (key in modifier) return undefined
  if (!parts.every((part) => part in modifier)) return undefined
  return [...parts.map((part) => modifier[part as keyof typeof modifier]), namedKey[key] ?? key.toUpperCase()].join('+')
}

function send(channel: string): void {
  const win = BrowserWindow.getFocusedWindow()
  win?.webContents.send(channel)
}
