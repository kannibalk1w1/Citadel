// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppearanceSettings } from './AppearanceSettings'
import { useUIStore } from '../../store/uiStore'
import { FONT_ROLE_LABELS } from '../../../types/appearance'

const invoke = vi.fn()

const snippets = {
  folder: '/data/snippets',
  snippets: [
    { name: 'contrast', css: ':root { --accent: #f00; }', enabled: false, bytes: 24 },
    { name: 'quiet', css: ':root { --border: #111; }', enabled: true, bytes: 25 },
  ],
}

const fonts = {
  folder: '/data/fonts',
  fonts: [{ family: 'Berkeley Mono', file: 'Berkeley Mono.woff2', bytes: 100 }],
  choices: { mono: 'Berkeley Mono' },
}

beforeEach(() => {
  document.head.innerHTML = ''
  invoke.mockReset().mockImplementation(async (channel: string) => {
    if (channel === 'styles:list') return snippets
    if (channel === 'fonts:list') return fonts
    if (channel === 'fonts:read') return { ok: false }
    return { ok: true }
  })
  Object.assign(window, { ipc: { invoke } })
  useUIStore.setState({ mascot: 'citadel', mascotImage: null })
})

afterEach(() => cleanup())

describe('the customisation panel', () => {
  it('lists the stylesheets in the folder, with what is on already ticked', async () => {
    render(<AppearanceSettings />)

    await waitFor(() => expect(screen.getByText('contrast.css')).toBeTruthy())
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes.map((box) => box.checked)).toEqual([false, true])
  })

  it('switches one on and says so', async () => {
    render(<AppearanceSettings />)
    await waitFor(() => expect(screen.getByText('contrast.css')).toBeTruthy())

    await userEvent.click(screen.getAllByRole('checkbox')[0])

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('styles:setEnabled', { name: 'contrast', enabled: true }))
  })

  it('offers to open both folders, because an empty list needs somewhere to go', async () => {
    render(<AppearanceSettings />)

    await userEvent.click(screen.getByRole('button', { name: 'Open snippets folder' }))
    await userEvent.click(screen.getByRole('button', { name: 'Open fonts folder' }))

    expect(invoke).toHaveBeenCalledWith('styles:openFolder')
    expect(invoke).toHaveBeenCalledWith('fonts:openFolder')
  })

  it('names the folder when there is nothing in it yet', async () => {
    invoke.mockImplementation(async (channel: string) => (
      channel === 'styles:list' ? { folder: '/data/snippets', snippets: [] } : fonts
    ))
    render(<AppearanceSettings />)

    await waitFor(() => expect(screen.getByText(/\/data\/snippets/)).toBeTruthy())
  })

  it('has a field for each type role, filled with the current choice', async () => {
    render(<AppearanceSettings />)

    await waitFor(() => expect((screen.getByLabelText(FONT_ROLE_LABELS.mono) as HTMLInputElement).value).toBe('Berkeley Mono'))
    expect((screen.getByLabelText(FONT_ROLE_LABELS.body) as HTMLInputElement).value).toBe('')
    // Blank means the shipped font, and the placeholder has to say so.
    expect(screen.getByLabelText(FONT_ROLE_LABELS.body).getAttribute('placeholder')).toBe('Citadel default')
  })

  it('accepts any family name, not only the files in the folder', async () => {
    render(<AppearanceSettings />)
    const field = await screen.findByLabelText(FONT_ROLE_LABELS.body)

    await userEvent.type(field, 'Comic Sans MS')
    await userEvent.tab()

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('fonts:setChoice', { role: 'body', family: 'Comic Sans MS' }))
  })

  it('offers every mascot, and marks the one in use', async () => {
    render(<AppearanceSettings />)

    expect(screen.getByRole('button', { name: 'Tower', pressed: true })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Rook' }))

    expect(useUIStore.getState().mascot).toBe('rook')
  })

  it('asks for a file when the mascot is a person’s own image', async () => {
    invoke.mockImplementation(async (channel: string) => {
      if (channel === 'styles:list') return snippets
      if (channel === 'fonts:list') return fonts
      if (channel === 'file:openDialog') return { path: 'C:/art/sigil.png' }
      return { ok: true }
    })
    render(<AppearanceSettings />)

    await userEvent.click(screen.getByRole('button', { name: 'Your own image' }))

    await waitFor(() => expect(useUIStore.getState().mascotImage).toBe('C:/art/sigil.png'))
    expect(useUIStore.getState().mascot).toBe('custom')
  })
})
