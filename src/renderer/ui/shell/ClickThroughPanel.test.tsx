// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUIStore } from '../../store/uiStore'
import { ClickThroughPanel } from './ClickThroughPanel'

const invoke = vi.fn(async (_channel: string, _payload?: unknown) => ({ ok: true }))

function regionCalls(): unknown[] {
  return invoke.mock.calls.filter((call) => call[0] === 'window:setInteractiveRegion').map((call) => call[1])
}

describe('ClickThroughPanel', () => {
  beforeEach(() => {
    invoke.mockClear()
    Object.assign(window, { ipc: { invoke } })
    useUIStore.setState({ windowClickThrough: false, windowAlwaysOnTop: false, windowOpacity: 1 })
    // jsdom gives every element a zero rect; a real one lets the reported
    // geometry be checked.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 900, top: 640, width: 200, height: 56, right: 1100, bottom: 696, x: 900, y: 640, toJSON: () => ({}),
    } as DOMRect)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('stays out of the way until click-through is on', () => {
    const { container } = render(<ClickThroughPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('states the mode rather than only signalling it with colour', () => {
    useUIStore.setState({ windowClickThrough: true })
    render(<ClickThroughPanel />)

    const panel = screen.getByRole('status')
    expect(panel.getAttribute('aria-label')).toBe('Click-through is on')
    expect(panel.textContent).toContain('Clicks pass through')
  })

  it('offers a keyboard-reachable way out, and names the shortcut too', () => {
    useUIStore.setState({ windowClickThrough: true })
    render(<ClickThroughPanel />)

    const stop = screen.getByRole('button', { name: /stop click-through/i })
    expect(stop.tagName).toBe('BUTTON')
    expect(stop.getAttribute('aria-label')).toContain('Ctrl+Alt+C')
  })

  it('leaves click-through through the same window mode path as everything else', () => {
    useUIStore.setState({ windowClickThrough: true })
    render(<ClickThroughPanel />)

    fireEvent.click(screen.getByRole('button', { name: /stop click-through/i }))

    expect(invoke).toHaveBeenCalledWith('window:setMode', { clickThrough: false })
  })

  it('reports where it sits so main knows what to keep clickable', () => {
    useUIStore.setState({ windowClickThrough: true })
    render(<ClickThroughPanel />)

    expect(regionCalls()).toContainEqual({ x: 900, y: 640, width: 200, height: 56 })
  })

  it('re-reports its position when the window is resized', () => {
    useUIStore.setState({ windowClickThrough: true })
    render(<ClickThroughPanel />)
    const before = regionCalls().length

    fireEvent(window, new Event('resize'))

    expect(regionCalls().length).toBeGreaterThan(before)
  })

  // A stale rect would leave a patch of screen quietly eating clicks after the
  // mode is off.
  it('withdraws its region when click-through ends', () => {
    useUIStore.setState({ windowClickThrough: true })
    const view = render(<ClickThroughPanel />)

    useUIStore.setState({ windowClickThrough: false })
    view.rerender(<ClickThroughPanel />)

    expect(regionCalls().at(-1)).toBeNull()
  })

  it('withdraws its region when it unmounts', () => {
    useUIStore.setState({ windowClickThrough: true })
    const view = render(<ClickThroughPanel />)

    view.unmount()

    expect(regionCalls().at(-1)).toBeNull()
  })

  it('keeps no window state of its own beyond what the store reports', () => {
    useUIStore.setState({ windowClickThrough: true })
    render(<ClickThroughPanel />)
    expect(screen.queryByRole('status')).toBeTruthy()

    // Main is the owner: a push through setWindowModeFromMain must be enough to
    // dismiss the panel, with no local flag surviving it.
    useUIStore.getState().setWindowModeFromMain({ alwaysOnTop: true, opacity: 1, clickThrough: false })
    cleanup()
    render(<ClickThroughPanel />)

    expect(screen.queryByRole('status')).toBeNull()
  })
})
