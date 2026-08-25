import { describe, expect, it } from 'vitest'
import { Actions } from './actions'
import { KeybindResolver } from './keybindResolver'
import { formatCombo, shortcutHint } from './shortcutHint'

describe('formatCombo', () => {
  it('reads a combo the way a person would say it', () => {
    expect(formatCombo('ctrl+shift+z')).toBe('Ctrl+Shift+Z')
    expect(formatCombo('arrowright')).toBe('→')
    expect(formatCombo('f5')).toBe('f5')
  })
})

describe('shortcutHint', () => {
  it('appends the real binding, parenthesised', () => {
    expect(shortcutHint(Actions.RECORD_TOGGLE)).toBe(' (Ctrl+R)')
  })

  it('says nothing at all when the action is unbound', () => {
    expect(shortcutHint(Actions.EXPORT_PDF)).toBe('')
  })
})

describe('advertised tool shortcuts', () => {
  // The record button spent its life promising `(R)` while the action sat on
  // Ctrl+R, so pressing the advertised key did nothing. Anything a control
  // offers has to be a binding that exists.
  const TOOLBAR_ACTIONS = [
    Actions.TOOL_SELECT, Actions.TOOL_PAN, Actions.TOOL_LASSO, Actions.TOOL_CONNECT,
    Actions.TOOL_TEXT, Actions.TOOL_CODE, Actions.TOOL_STICKY,
    Actions.TOOL_LINK, Actions.TOOL_SWATCH, Actions.TOOL_TAG, Actions.TOOL_COMPARISON,
    Actions.RECORD_TOGGLE, Actions.TOGGLE_SNAP, Actions.AUTO_ARRANGE, Actions.PRESENTATION_TOGGLE,
  ]

  it.each(TOOLBAR_ACTIONS)('%s has a key bound for the toolbar to show', (action) => {
    expect(shortcutHint(action)).not.toBe('')
  })

  it('advertises a combo that still resolves back to its own action', () => {
    // Actions may deliberately share a secondary key — Escape is both "select
    // tool" and "deselect" — so what matters is that the one being shown is not
    // the half some other action won.
    const resolver = new KeybindResolver()
    for (const action of TOOLBAR_ACTIONS) {
      const advertised = resolver.bindingsFor(action)[0]
      expect(resolver.actionForCombo(advertised)).toBe(action)
    }
  })
})
