// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TranscriptionSettings, engineSummary, formatModelSize } from './TranscriptionSettings'
import { TRANSCRIPTION_MODELS } from '../../../types/transcription'
import { useInscriptionToastStore } from '../toasts/inscriptionToastStore'

const invoke = vi.fn()
const [fastModel] = TRANSCRIPTION_MODELS

const payload = (overrides: Record<string, unknown> = {}) => ({
  states: TRANSCRIPTION_MODELS.map((model) => ({ id: model.id, installed: false })),
  choice: { managedId: null, customPath: null },
  engine: { source: 'bundled', path: '/opt/citadel/whisper-cli' },
  ...overrides,
})

beforeEach(() => {
  invoke.mockReset()
  invoke.mockImplementation(async (channel: string) => (
    channel === 'transcription:models' ? payload() : { ok: true }
  ))
  Object.assign(window, { ipc: { invoke } })
  useInscriptionToastStore.setState({ toasts: [] })
})

afterEach(() => cleanup())

const toastTexts = (): string[] => useInscriptionToastStore.getState().toasts.map((toast) => toast.text)

describe('TranscriptionSettings', () => {
  it('says plainly that nothing is uploaded, and when the network is used', async () => {
    render(<TranscriptionSettings />)
    expect(screen.getByText(/never uploaded/i)).toBeTruthy()
    expect(screen.getByText(/only\s+time Citadel reaches the network/i)).toBeTruthy()
  })

  it('offers every catalogue model with its size', async () => {
    render(<TranscriptionSettings />)

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(TRANSCRIPTION_MODELS.length))
    for (const model of TRANSCRIPTION_MODELS) {
      expect(screen.getByText(model.label)).toBeTruthy()
      expect(screen.getByText(new RegExp(formatModelSize(model.bytes)))).toBeTruthy()
    }
  })

  it('puts a downloaded model straight into use rather than making it a second choice', async () => {
    render(<TranscriptionSettings />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Download' }).length).toBeGreaterThan(0))

    await userEvent.click(screen.getAllByRole('button', { name: 'Download' })[0])

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('transcription:downloadModel', { id: fastModel.id }))
    expect(invoke).toHaveBeenCalledWith('transcription:useModel', { id: fastModel.id })
    expect(toastTexts()[0]).toContain(fastModel.label)
  })

  it('says why a download failed instead of leaving the row unchanged in silence', async () => {
    invoke.mockImplementation(async (channel: string) => {
      if (channel === 'transcription:models') return payload()
      if (channel === 'transcription:downloadModel') return { ok: false, reason: 'The download server answered 404.' }
      return { ok: true }
    })
    render(<TranscriptionSettings />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Download' }).length).toBeGreaterThan(0))

    await userEvent.click(screen.getAllByRole('button', { name: 'Download' })[0])

    await waitFor(() => expect(toastTexts()[0]).toBe('The download server answered 404.'))
    expect(invoke).not.toHaveBeenCalledWith('transcription:useModel', { id: fastModel.id })
  })

  it('offers to remove an installed model and marks the one in use', async () => {
    invoke.mockImplementation(async (channel: string) => (
      channel === 'transcription:models'
        ? payload({
          states: TRANSCRIPTION_MODELS.map((model) => ({ id: model.id, installed: model.id === fastModel.id })),
          choice: { managedId: fastModel.id, customPath: null },
        })
        : { ok: true }
    ))
    render(<TranscriptionSettings />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy())
    expect(screen.getByText('in use')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Use' })).toBeNull()
  })

  it('lets a person point at a model file they already have', async () => {
    render(<TranscriptionSettings />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Choose file' })).toBeTruthy())

    await userEvent.click(screen.getByRole('button', { name: 'Choose file' }))

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('transcription:chooseModelFile'))
    expect(toastTexts()[0]).toBe('Transcription model chosen')
  })

  it('shows a custom model as the one in use, with a way back', async () => {
    invoke.mockImplementation(async (channel: string) => (
      channel === 'transcription:models'
        ? payload({ choice: { managedId: fastModel.id, customPath: '/models/mine.bin' } })
        : { ok: true }
    ))
    render(<TranscriptionSettings />)

    await waitFor(() => expect(screen.getByText('/models/mine.bin')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy()
    // The managed id is remembered, but the custom file is what is in use.
    expect(screen.getAllByText('in use')).toHaveLength(1)
  })

  it('draws its rows even when the bridge answers with nothing', async () => {
    invoke.mockResolvedValue(undefined)
    render(<TranscriptionSettings />)

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(TRANSCRIPTION_MODELS.length))
    expect(screen.getByText('not loaded')).toBeTruthy()
  })
})

describe('engineSummary', () => {
  it('names a missing recogniser rather than an empty line', () => {
    expect(engineSummary({ source: 'missing', path: null })).toBe('Not found in this install')
    expect(engineSummary({ source: 'bundled', path: '/opt/whisper-cli' })).toBe('Included with Citadel')
    expect(engineSummary({ source: 'custom', path: '/home/me/whisper-cli' })).toBe('/home/me/whisper-cli')
  })
})
