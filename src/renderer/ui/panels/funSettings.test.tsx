// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeybindSettings } from './KeybindSettings'
import { useUIStore } from '../../store/uiStore'

// These three flourishes were removed once already as "arcade chrome" and had to
// be recovered. The wiring is what rots — the store flag surviving while nothing
// reads it — so this covers the toggle through to the persisted setting.
const invoke = vi.fn().mockResolvedValue({ count: 0, bytes: 0 })
Object.defineProperty(window, 'ipc', { value: { invoke }, writable: true })

const TOGGLES = [
  { label: 'YOU SAVED banner on manual save', flag: 'youSavedEnabled', key: 'ui.youSavedEnabled' },
  { label: 'HyperType mode', flag: 'hyperTypeEnabled', key: 'ui.hyperTypeEnabled' },
  { label: 'Dragon Scimitar cursor', flag: 'dragonCursorEnabled', key: 'ui.dragonCursorEnabled' },
] as const

describe('fun settings', () => {
  afterEach(cleanup)

  beforeEach(() => {
    invoke.mockClear()
    useUIStore.setState({
      panels: { ...useUIStore.getState().panels, keybindSettings: true },
      youSavedEnabled: false,
      hyperTypeEnabled: false,
      dragonCursorEnabled: false,
    })
  })

  it.each(TOGGLES)('turns $label on and persists it', ({ label, flag, key }) => {
    render(<KeybindSettings />)

    fireEvent.click(screen.getByLabelText(label, { exact: false, selector: 'input' }))

    expect(useUIStore.getState()[flag]).toBe(true)
    expect(invoke).toHaveBeenCalledWith('settings:set', { key, value: true })
  })

  it('defaults every flourish to off so a fresh install is plain', () => {
    // Deliberately reading defaults rather than the state set in beforeEach.
    const fresh = useUIStore.getInitialState?.() ?? useUIStore.getState()

    expect(fresh.youSavedEnabled).toBe(false)
    expect(fresh.hyperTypeEnabled).toBe(false)
    expect(fresh.dragonCursorEnabled).toBe(false)
  })
})
