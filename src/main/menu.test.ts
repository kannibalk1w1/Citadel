import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: vi.fn() },
  BrowserWindow: { getFocusedWindow: vi.fn() },
  app: { getPath: vi.fn(() => '/tmp/citadel-test'), getVersion: vi.fn(() => '0.1.0') },
}))

import { BrowserWindow } from 'electron'

import { readFileSync } from 'fs'
import { join } from 'path'
import { Menu } from 'electron'
import { CITADEL_TAGLINE, buildMenu, toElectronAccelerator } from './menu'

type MenuItem = { label?: string; type?: string; submenu?: MenuItem[]; click?: () => void }

function templateFor(): MenuItem[] {
  vi.mocked(Menu.buildFromTemplate).mockClear()
  buildMenu()
  return vi.mocked(Menu.buildFromTemplate).mock.calls[0][0] as MenuItem[]
}

/**
 * Settings sat behind the toolbar's overflow menu and nowhere else, which is a
 * long way to reach for the panel that holds the theme, exports, transcription
 * and every shortcut. The menu bar carries a second way in.
 */
describe('the Help menu', () => {
  it('shows the running version, read from the manifest rather than written twice', () => {
    const help = templateFor().find((item) => item.label === 'Help')
    // The mock returns 0.1.0; what matters is that the label is built from
    // app.getVersion(), so a release bump reaches the menu on its own.
    expect(help?.submenu?.[0].label).toBe('Citadel v0.1.0')
  })

  it('says what Citadel is, under the number', () => {
    const help = templateFor().find((item) => item.label === 'Help')
    expect(help?.submenu?.[1].label).toBe(CITADEL_TAGLINE)
  })

  it('carries no version number of its own to go stale', () => {
    // A hardcoded version in the tagline is a version that survives a release.
    expect(CITADEL_TAGLINE).not.toMatch(/\d+\.\d+/)
  })
})

describe('the Settings entry in the menu bar', () => {
  it('is in the Edit menu', () => {
    const edit = templateFor().find((item) => item.label === 'Edit')
    expect(edit?.submenu?.some((item) => item.label === 'Settings')).toBe(true)
  })

  it('opens the same panel the toolbar does', () => {
    const sent: string[] = []
    vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue({
      webContents: { send: (channel: string) => sent.push(channel) },
    } as never)

    const edit = templateFor().find((item) => item.label === 'Edit')
    edit?.submenu?.find((item) => item.label === 'Settings')?.click?.()

    expect(sent).toEqual(['menu:settings'])
  })

  it('is wired to an action on the other side of the bridge', () => {
    const app = readFileSync(join(process.cwd(), 'src', 'renderer', 'App.tsx'), 'utf-8')

    // A channel with no listener is a menu item that does nothing at all.
    expect(app).toContain("ipc.on('menu:settings'")
    expect(app).toContain('Actions.PANEL_KEYBINDS')
  })

  it('advertises no shortcut it does not own', () => {
    // The action ships unbound, so the item must not claim a combination that
    // belongs to something else. It picks one up only if a person binds it.
    const edit = templateFor().find((item) => item.label === 'Edit')
    const settings = edit?.submenu?.find((item) => item.label === 'Settings') as { accelerator?: string }
    expect(settings.accelerator).toBeUndefined()
  })
})

describe('native menu accelerator conversion', () => {
  it('uses the same canonical combinations saved by the renderer', () => {
    expect(toElectronAccelerator('ctrl+shift+u')).toBe('Ctrl+Shift+U')
    expect(toElectronAccelerator('meta+space')).toBe('Command+Space')
    expect(toElectronAccelerator('ctrl+plus')).toBe('Ctrl+Plus')
  })

  /**
   * Electron's key list has no `Minus` or `Equal`; it rejects the whole
   * accelerator, so the menu item quietly loses its shortcut. It accepts the
   * punctuation directly. This is the pairing that left Zoom Out unbound.
   */
  it('emits key names Electron actually accepts for punctuation keys', () => {
    expect(toElectronAccelerator('ctrl+minus')).toBe('Ctrl+-')
    expect(toElectronAccelerator('ctrl+=')).toBe('Ctrl+=')
    expect(toElectronAccelerator('ctrl+alt+minus')).toBe('Ctrl+Alt+-')
  })

  it('refuses malformed combinations rather than registering an unintended shortcut', () => {
    expect(toElectronAccelerator('hyper+x')).toBeUndefined()
    expect(toElectronAccelerator(undefined)).toBeUndefined()
    // Modifiers with no key half would bind the menu item to the reach for it.
    expect(toElectronAccelerator('ctrl')).toBeUndefined()
    expect(toElectronAccelerator('ctrl+shift')).toBeUndefined()
  })
})
