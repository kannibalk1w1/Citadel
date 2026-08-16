import { describe, expect, it, vi } from 'vitest'
import { Actions } from './actions'
import { KeybindResolver, normalizeKeybindOverrides } from './keybindResolver'

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
})
