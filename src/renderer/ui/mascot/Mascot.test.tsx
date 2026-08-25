// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CitadelMascot } from './CitadelMascot'
import { Mascot } from './Mascot'
import { useUIStore, mascotChoices, mascotLabels } from '../../store/uiStore'
import { useHistoryStore } from '../../store/historyStore'

const invoke = vi.fn()

beforeEach(() => {
  invoke.mockReset().mockResolvedValue({ ok: true })
  Object.assign(window, { ipc: { invoke } })
  useUIStore.setState({ mascot: 'citadel', mascotImage: null })
  useHistoryStore.setState({ isRecording: false })
})

afterEach(() => cleanup())

describe('Mascot', () => {
  it('shows nothing at all when it is switched off', () => {
    useUIStore.setState({ mascot: 'none' })
    const { container } = render(<Mascot />)
    expect(container.firstChild).toBeNull()
  })

  it('shows each built-in face without any effect plumbing behind it', () => {
    for (const choice of ['citadel', 'rook'] as const) {
      cleanup()
      useUIStore.setState({ mascot: choice })
      render(<Mascot />)
      expect(screen.getByRole('img')).toBeTruthy()
    }
  })

  it('shows a person’s own image when they have chosen one', () => {
    useUIStore.setState({ mascot: 'custom', mascotImage: 'C:/art/sigil.png' })
    render(<Mascot />)

    const image = screen.getByAltText('Citadel') as HTMLImageElement
    expect(image.getAttribute('src')).toBe('local:///C:/art/sigil.png')
  })

  it('falls back to the tower when custom is chosen with no image yet', () => {
    useUIStore.setState({ mascot: 'custom', mascotImage: null })
    render(<Mascot />)

    // Not a gap where the badge should be.
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('says a recording is running, which is the whole job it has', () => {
    useUIStore.setState({ mascot: 'citadel' })
    useHistoryStore.setState({ isRecording: true })
    render(<Mascot />)

    expect(document.querySelector('.citadel-mascot')?.getAttribute('data-state')).toBe('recording')
  })

  it('lights the gate after saving dirty work', () => {
    vi.useFakeTimers()
    useHistoryStore.setState({ cursor: 1, savedCursor: 0 })
    const { container } = render(<Mascot />)

    act(() => { useHistoryStore.setState({ cursor: 1, savedCursor: 1 }) })
    expect(container.querySelector('.citadel-mascot')?.getAttribute('data-state')).toBe('saved')
    expect(container.querySelector('[data-part="gate"]')?.getAttribute('fill')).toBe('var(--accent)')

    act(() => { vi.advanceTimersByTime(1600) })
    expect(container.querySelector('.citadel-mascot')?.getAttribute('data-state')).toBe('rest')
    vi.useRealTimers()
  })

  it('remembers the choice, so it survives a restart', () => {
    useUIStore.getState().setMascot('rook')

    expect(invoke).toHaveBeenCalledWith('settings:set', { key: 'ui.mascot', value: 'rook' })
    expect(useUIStore.getState().mascot).toBe('rook')
  })

  it('turns a chosen image into the choice that shows it', () => {
    useUIStore.getState().setMascotImage('C:/art/sigil.png')

    expect(useUIStore.getState().mascot).toBe('custom')
    expect(invoke).toHaveBeenCalledWith('settings:setMany', {
      values: { 'ui.mascotImage': 'C:/art/sigil.png', 'ui.mascot': 'custom' },
    })
  })

  it('draws the citadel with theme tokens rather than a raster filter', () => {
    const { container } = render(<CitadelMascot state="rest" />)

    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-part="tower"]')?.getAttribute('fill')).toBe('var(--text-secondary)')
    expect(container.querySelector('[data-part="gate"]')?.getAttribute('fill')).toBe('var(--bg-panel)')
  })

  it('changes only the gate for saved and recording states', () => {
    const { container, rerender } = render(<CitadelMascot state="saved" />)

    expect(container.querySelector('[data-part="gate"]')?.getAttribute('fill')).toBe('var(--accent)')
    expect(container.querySelector('[data-part="tower"]')?.getAttribute('fill')).toBe('var(--text-secondary)')

    rerender(<CitadelMascot state="recording" />)
    expect(container.querySelector('[data-part="gate"]')?.getAttribute('fill')).toBe('var(--accent-danger)')
    expect(container.querySelector('[data-part="tower"]')?.getAttribute('fill')).toBe('var(--text-secondary)')
  })

  it('has a name for every choice it offers', () => {
    for (const choice of mascotChoices) expect(mascotLabels[choice]).toBeTruthy()
  })
})
