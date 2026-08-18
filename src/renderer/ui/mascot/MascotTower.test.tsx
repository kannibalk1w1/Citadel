// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MascotTower } from './MascotTower'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'

const invoke = vi.fn().mockResolvedValue({ ok: true })
Object.defineProperty(window, 'ipc', { value: { invoke }, writable: true })

const dirty = () => useHistoryStore.setState({ cursor: 1, savedCursor: 0 })
const clean = () => useHistoryStore.setState({ cursor: 1, savedCursor: 1 })

describe('the mascot', () => {
  afterEach(cleanup)

  beforeEach(() => {
    invoke.mockClear()
    useUIStore.setState({ mascotVisible: true })
    useHistoryStore.getState().resetHistory()
  })

  it('is drawn, not loaded — nothing to ship and nothing to lose', () => {
    const { container } = render(<MascotTower />)

    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })

  it('says what it is showing rather than only colouring it', () => {
    clean()
    render(<MascotTower />)

    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Citadel')
  })

  it('shows unsaved work without anything having to tell it', () => {
    dirty()
    render(<MascotTower />)

    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('unsaved')
  })

  it('acknowledges a save, then settles', () => {
    vi.useFakeTimers()
    dirty()
    const view = render(<MascotTower />)

    act(() => { clean() })
    view.rerender(<MascotTower />)
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('saved')

    act(() => { vi.advanceTimersByTime(2000) })
    view.rerender(<MascotTower />)
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Citadel')
    vi.useRealTimers()
  })

  it('shows a recording over everything else', () => {
    dirty()
    useHistoryStore.setState({ isRecording: true })
    render(<MascotTower />)

    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('recording')
  })

  it('can be turned off, and remembers it', () => {
    useUIStore.setState({ mascotVisible: false })
    const { container } = render(<MascotTower />)
    expect(container.firstChild).toBeNull()

    act(() => { useUIStore.getState().toggleMascot() })
    expect(invoke).toHaveBeenCalledWith('settings:set', { key: 'ui.mascotVisible', value: true })
  })

  it('scales from one number, so the rail can ask for a smaller one', () => {
    const { container } = render(<MascotTower size={16} />)

    expect((container.firstChild as HTMLElement).style.width).toBe('16px')
  })
})
