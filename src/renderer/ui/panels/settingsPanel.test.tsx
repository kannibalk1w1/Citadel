// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeybindSettings } from './KeybindSettings'
import { Toolbar } from '../Toolbar'
import { useUIStore } from '../../store/uiStore'
import { actionLabel } from '../../keybinds/actionLabels'
import { Actions } from '../../keybinds/actions'

vi.mock('react-konva', () => ({ Line: () => null, Text: () => null, Rect: () => null }))

/**
 * The panel began as a keybinding editor and grew into the whole settings
 * surface: theme, export, transcription, maintenance, and shortcuts. It was
 * still called Keybindings, and the control that opens it was called
 * "Appearance settings", so neither name matched what a person would find.
 */
beforeEach(() => {
  Object.assign(window, { ipc: { invoke: vi.fn().mockResolvedValue(undefined), on: vi.fn(() => () => {}) } })
  useUIStore.setState({ panels: { ...useUIStore.getState().panels, keybindSettings: true } })
})

afterEach(() => cleanup())

describe('the settings panel', () => {
  it('is called Settings, because that is what it holds', () => {
    render(<KeybindSettings />)
    expect(screen.getByRole('heading', { level: 2, name: 'Settings' })).toBeTruthy()
  })

  it('keeps the shortcuts as one named section among the others', () => {
    render(<KeybindSettings />)

    for (const section of ['Keyboard shortcuts', 'Transcription', 'Maintenance']) {
      expect(screen.getByRole('heading', { name: section })).toBeTruthy()
    }
    expect(screen.getByPlaceholderText('Filter actions…')).toBeTruthy()
  })

  it('is named Settings by the action that opens it, wherever that is shown', () => {
    // The identifier stays panel:keybinds, because saved overrides are keyed by
    // it. Only the words a person reads changed.
    expect(actionLabel(Actions.PANEL_KEYBINDS)).toBe('Open settings')
  })
})

describe('the toolbar control that opens it', () => {
  it('has Settings as its accessible name, not a description of one section', async () => {
    render(<Toolbar />)

    // It lives behind the overflow, which is part of why the Edit menu now
    // carries a second way in.
    await userEvent.click(screen.getByRole('button', { name: 'More tools' }))

    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
  })
})
