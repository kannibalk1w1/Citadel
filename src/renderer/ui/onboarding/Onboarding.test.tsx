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

  it('only offers actions the resolver actually knows', () => {
    const known = new Set<string>(Object.values(Actions))
    const dispatch = vi.spyOn(resolver, 'dispatch').mockImplementation(() => true)
    render(<Onboarding />)

    // Every action button on the card, driven in turn. A step wired to a typo'd
    // or removed action would dispatch something the resolver cannot route.
    const labels = screen.getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .filter((label) => label && label !== 'Continue to board')

    for (const label of labels) {
      cleanup()
      render(<Onboarding />)
      const button = screen.queryByRole('button', { name: label })
      if (button) fireEvent.click(button)
    }

    const dispatched = dispatch.mock.calls.map(([action]) => action)
    expect(dispatched.length).toBeGreaterThan(0)
    for (const action of dispatched) expect(known).toContain(action)
    dispatch.mockRestore()
  })

  // The card is orientation, not a catalogue — but it went a long stretch
  // describing a build that had grown past it. This pins the spine it must
  // still cover, so adding a headline feature is a conscious decision to
  // mention it here or not.
  it.each([
    ['importing existing work', /drag in|open a saved/i],
    ['writing on the board', /note|code card/i],
    ['connecting items together', /connection/i],
    ['searching the archive', /index|search/i],
    ['reviewing work', /vision|study|history/i],
    ['overlay safety', /click-through/i],
  ])('orients the reader on %s', (_subject, pattern) => {
    render(<Onboarding />)

    expect(screen.getByLabelText('Getting started').textContent).toMatch(pattern)
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
