import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: vi.fn() },
  BrowserWindow: { getFocusedWindow: vi.fn() },
  app: { getPath: vi.fn(), getVersion: vi.fn() },
}))

import { toElectronAccelerator } from './menu'

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
