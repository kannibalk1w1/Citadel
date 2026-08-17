// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeybindSettings } from './KeybindSettings'
import { useUIStore } from '../../store/uiStore'

const invoke = vi.fn()
Object.defineProperty(window, 'ipc', { value: { invoke }, writable: true })

const packFile = {
  format: 'citadel-cursors',
  version: 1,
  name: 'Dragon Scimitar',
  cursors: { pan: 'data:image/vnd.microsoft.icon;base64,AAABAAEAEBA=' },
}

/** file:openDialog then file:load; everything else is the panel's own chatter. */
function answerImportWith(data: unknown): void {
  invoke.mockImplementation(async (channel: string) => {
    if (channel === 'file:openDialog') return { path: 'C:/packs/dragon.citadel-cursors.json' }
    if (channel === 'file:load') return { data: typeof data === 'string' ? data : JSON.stringify(data) }
    return { count: 0, bytes: 0 }
  })
}

describe('importing a cursor pack', () => {
  afterEach(cleanup)

  beforeEach(() => {
    invoke.mockReset()
    invoke.mockResolvedValue({ count: 0, bytes: 0 })
    useUIStore.setState({
      panels: { ...useUIStore.getState().panels, keybindSettings: true },
      cursorPack: null,
    })
  })

  it('shows system cursors until a pack is imported', () => {
    render(<KeybindSettings />)

    expect(screen.getByText('system cursors')).toBeTruthy()
  })

  it('applies a valid pack and names it', async () => {
    answerImportWith(packFile)
    render(<KeybindSettings />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Import…' }).at(-1)!)

    await waitFor(() => expect(useUIStore.getState().cursorPack?.name).toBe('Dragon Scimitar'))
    expect(await screen.findByText('cursor pack applied')).toBeTruthy()
    expect(invoke).toHaveBeenCalledWith('settings:set', expect.objectContaining({ key: 'ui.cursorPack' }))
  })

  it('refuses a pack pointing at a remote image rather than applying it', async () => {
    answerImportWith({ ...packFile, cursors: { pan: 'https://example.com/track.png' } })
    render(<KeybindSettings />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Import…' }).at(-1)!)

    expect(await screen.findByText('not a valid cursor pack')).toBeTruthy()
    expect(useUIStore.getState().cursorPack).toBeNull()
  })

  it('reports a file that is not JSON instead of throwing', async () => {
    answerImportWith('this is not json')
    render(<KeybindSettings />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Import…' }).at(-1)!)

    expect(await screen.findByText('could not read that cursor pack')).toBeTruthy()
    expect(useUIStore.getState().cursorPack).toBeNull()
  })

  it('clears back to the system cursors', async () => {
    useUIStore.setState({ cursorPack: packFile as never })
    render(<KeybindSettings />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(useUIStore.getState().cursorPack).toBeNull()
    expect(await screen.findByText('using system cursors')).toBeTruthy()
  })
})
