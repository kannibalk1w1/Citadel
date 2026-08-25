// @vitest-environment jsdom
import { readFileSync } from 'fs'
import { join } from 'path'
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Mascot } from './Mascot'
import { useUIStore, mascotChoices, mascotLabels } from '../../store/uiStore'
import { useHistoryStore } from '../../store/historyStore'

const invoke = vi.fn()

/**
 * The pixel-art tower shipped in the first build and was dropped with the rest
 * of `assets/` in the clean-interface pass. It is back as a choice, without the
 * effect queue that got the mascot removed. Which face the rail shows is now
 * the person's decision, including one of their own.
 */
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

  it('is inverted for the dark themes, or it would be a hole in the panel', () => {
    // The art is black lines on transparency. 87% of its opaque pixels are
    // near-black, which on a near-black panel is nothing at all.
    render(<Mascot />)
    expect(document.querySelector('img')?.className).toBe('citadel-mascot-tower')

    const css = readFileSync(join(process.cwd(), 'src', 'renderer', 'theme', 'dark.css'), 'utf-8')
    expect(css).toMatch(/\.citadel-mascot-tower \{\s*filter: invert\(1\);/)
    expect(css).toMatch(/\[data-theme="light"\] \.citadel-mascot-tower \{\s*filter: none;/)
  })

  it('has a name for every choice it offers', () => {
    for (const choice of mascotChoices) expect(mascotLabels[choice]).toBeTruthy()
  })
})
