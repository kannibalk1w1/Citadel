import { describe, expect, it, vi } from 'vitest'
import { Actions } from './actions'
import { KeybindResolver, normalizeKeybindOverrides, serializeEvent } from './keybindResolver'

describe('keybind overrides', () => {
  it('keeps only valid, known actions while preserving an intentional unbind', () => {
    expect(normalizeKeybindOverrides({
      [Actions.UNDO]: ['ctrl+u', 'ctrl+u', 'shift'],
      unknown: ['ctrl+x'],
      [Actions.REDO]: [],
    })).toEqual({
      [Actions.UNDO]: ['ctrl+u'],
      [Actions.REDO]: [],
    })
  })

  it('replaces the live shortcut map without losing registered handlers', () => {
    const keybinds = new KeybindResolver()
    const undo = vi.fn()
    keybinds.register(Actions.UNDO, undo)
    keybinds.setOverrides({ [Actions.UNDO]: ['ctrl+shift+u'] })

    expect(keybinds.bindingsFor(Actions.UNDO)).toEqual(['ctrl+shift+u'])
    expect(keybinds.actionForCombo('ctrl+shift+u')).toBe(Actions.UNDO)
    expect(keybinds.dispatch(Actions.UNDO)).toBe(true)
    expect(undo).toHaveBeenCalledOnce()
  })

  it('makes a reset durable by omitting it from the stored override map', () => {
    const keybinds = new KeybindResolver({ [Actions.UNDO]: ['ctrl+u'] })
    keybinds.setOverrides({})

    expect(keybinds.overridesForSettings()).toEqual({})
    expect(keybinds.bindingsFor(Actions.UNDO)).toContain('ctrl+z')
  })

  it('refuses a bare modifier, which a keydown produces on the way into a chord', () => {
    // `serializeEvent` writes modifiers as 'ctrl' while a KeyboardEvent names
    // them 'Control'. The guard used to check the DOM spelling, so 'ctrl' got
    // through and any Ctrl keypress fired the action it was saved against.
    const ctrlAlone = serializeEvent({ ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, key: 'Control' } as KeyboardEvent)
    expect(ctrlAlone).toBe('ctrl')

    expect(normalizeKeybindOverrides({ [Actions.UNDO]: ['ctrl', 'ctrl+shift', 'alt', 'ctrl+z'] }))
      .toEqual({ [Actions.UNDO]: ['ctrl+z'] })

    const keybinds = new KeybindResolver({ [Actions.UNDO]: ['ctrl'] })
    expect(keybinds.actionForCombo('ctrl')).toBeUndefined()
  })

  it('uses canonical names for keys that Electron menu accelerators also need', () => {
    expect(serializeEvent({ ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, key: ' ' } as KeyboardEvent)).toBe('ctrl+space')
    expect(serializeEvent({ ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, key: '+' } as KeyboardEvent)).toBe('ctrl+plus')
  })
})
