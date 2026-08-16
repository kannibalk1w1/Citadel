import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: vi.fn() },
  BrowserWindow: { getFocusedWindow: vi.fn() },
  app: { getPath: vi.fn(), getVersion: vi.fn() },
}))

import { MENU_DEFAULT_ACCELERATORS, toElectronAccelerator } from '../../main/menu'
import { defaultKeybinds } from './defaultKeybinds'
import { serializeEvent } from './keybindResolver'

/**
 * The native menu keeps its own fallback table because `src/main` cannot import
 * `src/renderer`. This test can see both, so it is the seam that keeps the copy
 * honest — the menu once advertised "Ctrl+Minus" for a shortcut the resolver
 * held as `ctrl+-`, which meant neither of them worked.
 */
describe('native menu defaults against the renderer keybinds', () => {
  it('falls back to a combination the action is actually bound to', () => {
    for (const [action, fallback] of Object.entries(MENU_DEFAULT_ACCELERATORS)) {
      const bound = defaultKeybinds[action]
      expect(bound, `${action} is in the menu but not in defaultKeybinds`).toBeDefined()
      expect(bound, `menu fallback "${fallback}" is not a binding of ${action}`).toContain(fallback)
    }
  })

  /**
   * A menu accelerator is claimed before the renderer ever sees the key, so a
   * menu item advertising a combination that some *other* action also holds
   * takes that key away from it for good. The menu offered Ctrl+0 for Fit
   * Canvas while the resolver held Ctrl+0 as Reset Zoom, which left Reset Zoom
   * with no way to be triggered at all.
   *
   * The previous case would not catch this on its own: a fallback can be a
   * legitimate binding of its own action and still be shared with another.
   */
  it('claims no combination that a different action is also bound to', () => {
    const owners = new Map<string, string[]>()
    for (const [action, combos] of Object.entries(defaultKeybinds)) {
      for (const combo of combos) owners.set(combo, [...(owners.get(combo) ?? []), action])
    }

    for (const [action, fallback] of Object.entries(MENU_DEFAULT_ACCELERATORS)) {
      const shared = (owners.get(fallback) ?? []).filter((owner) => owner !== action)
      expect(shared, `the menu gives ${action} "${fallback}", which ${shared.join(', ')} also holds`).toEqual([])
    }
  })

  it('converts every menu default into an accelerator Electron can parse', () => {
    // Electron rejects an unparseable accelerator outright, leaving the item
    // with no shortcut. `Minus` and `Equal` are the two names that look right
    // and are not in its key list.
    for (const [action, fallback] of Object.entries(MENU_DEFAULT_ACCELERATORS)) {
      const accelerator = toElectronAccelerator(fallback)
      expect(accelerator, `${action} produced no accelerator`).toBeDefined()
      expect(accelerator, `${action} uses a key name Electron rejects`).not.toMatch(/\b(Minus|Equal)\b/)
    }
  })
})

/**
 * A default that `serializeEvent` can never produce is a shortcut that silently
 * does nothing: the map is keyed by the serialised form, so a mismatched
 * spelling is looked up and never found.
 */
describe('default keybinds are reachable from a keyboard event', () => {
  const press = (combo: string): string => {
    const parts = combo.split('+')
    const key = parts.pop()!
    // Reconstruct the event the user would generate for this combo.
    const raw = key === 'space' ? ' ' : key === 'plus' ? '+' : key === 'minus' ? '-' : key
    return serializeEvent({
      ctrlKey: parts.includes('ctrl'),
      metaKey: parts.includes('meta'),
      altKey: parts.includes('alt'),
      shiftKey: parts.includes('shift'),
      key: raw,
    } as KeyboardEvent)
  }

  it('round-trips every default combo through serializeEvent', () => {
    for (const [action, combos] of Object.entries(defaultKeybinds)) {
      for (const combo of combos) {
        expect(press(combo), `${action} binds "${combo}", which no keypress produces`).toBe(combo)
      }
    }
  })

  it('gives zoom and window opacity a combination a laptop keyboard can reach', () => {
    // '+' needs Shift on most layouts, so a bare 'plus' binding is numpad-only.
    // Each of these pairs needs at least one unshifted top-row combination.
    const reachable = (combos: string[]): boolean => combos.some((combo) => !combo.includes('plus'))
    expect(reachable(defaultKeybinds['viewport:zoomIn'])).toBe(true)
    expect(reachable(defaultKeybinds['viewport:zoomOut'])).toBe(true)
    expect(reachable(defaultKeybinds['window:opacityUp'])).toBe(true)
    expect(reachable(defaultKeybinds['window:opacityDown'])).toBe(true)
  })
})
