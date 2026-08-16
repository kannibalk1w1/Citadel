// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Actions } from '../../keybinds/actions'
import { resolver } from '../../keybinds/keybindResolver'
import { useUIStore } from '../../store/uiStore'
import { Onboarding } from './Onboarding'

vi.mock('../icons/ToolIcon', () => ({ ToolIcon: () => <span /> }))

const invoke = vi.fn(async () => ({ ok: true }))

beforeEach(() => {
  Object.assign(window, { ipc: { invoke } })
  invoke.mockClear()
  useUIStore.setState((state) => ({ panels: { ...state.panels, onboarding: true } }))
})

afterEach(() => cleanup())

describe('Onboarding', () => {
  it('is a non-modal first-run guide that can be dismissed permanently', () => {
    render(<Onboarding />)

    expect(screen.getByLabelText('Getting started').getAttribute('aria-modal')).toBeNull()
    expect(screen.getByText('Welcome to Citadel')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue to board' }))

    expect(useUIStore.getState().panels.onboarding).toBe(false)
    expect(invoke).toHaveBeenCalledWith('settings:set', { key: 'ui.onboardingComplete', value: true })
  })

  it('routes a first-run action through the existing action resolver', () => {
    const dispatch = vi.spyOn(resolver, 'dispatch')
    render(<Onboarding />)

    fireEvent.click(screen.getByRole('button', { name: 'Open project' }))

    expect(dispatch).toHaveBeenCalledWith(Actions.OPEN)
    expect(useUIStore.getState().panels.onboarding).toBe(false)
    dispatch.mockRestore()
  })
})
