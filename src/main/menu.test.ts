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
    expect(toElectronAccelerator('ctrl+minus')).toBe('Ctrl+Minus')
  })

  it('refuses malformed combinations rather than registering an unintended shortcut', () => {
    expect(toElectronAccelerator('hyper+x')).toBeUndefined()
  })
})
