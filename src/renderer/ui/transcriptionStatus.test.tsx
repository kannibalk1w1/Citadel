// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TranscriptionStatus, phaseLabel } from './TranscriptionStatus'
import { useTranscriptionProgressStore } from './transcriptionProgressStore'

const invoke = vi.fn()

beforeEach(() => {
  invoke.mockReset().mockResolvedValue({ ok: true })
  Object.assign(window, { ipc: { invoke } })
  useTranscriptionProgressStore.setState({ run: null })
})

afterEach(() => cleanup())

describe('phaseLabel', () => {
  it('names the wait that has no percentage of its own', () => {
    expect(phaseLabel({ itemId: 'a', name: 'v.m4a', phase: 'decoding', percent: 0 })).toBe('Reading audio')
    expect(phaseLabel({ itemId: 'a', name: 'v.m4a', phase: 'loading-model', percent: 0 })).toBe('Loading model')
  })

  it('counts once the recogniser is actually working', () => {
    expect(phaseLabel({ itemId: 'a', name: 'v.m4a', phase: 'transcribing', percent: 42 })).toBe('Transcribing 42%')
  })
})

describe('TranscriptionStatus', () => {
  it('shows nothing at all when no transcription is running', () => {
    const { container } = render(<TranscriptionStatus />)
    expect(container.firstChild).toBeNull()
  })

  it('names the recording being transcribed', () => {
    useTranscriptionProgressStore.getState().begin('audio-1', 'voice.m4a')
    render(<TranscriptionStatus />)

    expect(screen.getByText('voice.m4a')).toBeTruthy()
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('offers a way out of a run that is taking too long', async () => {
    useTranscriptionProgressStore.getState().begin('audio-1', 'voice.m4a')
    render(<TranscriptionStatus />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(invoke).toHaveBeenCalledWith('audio:cancelTranscribe')
  })
})

describe('the progress store', () => {
  it('clamps and rounds whatever the engine reported', () => {
    const store = useTranscriptionProgressStore.getState()
    store.begin('audio-1', 'voice.m4a')

    store.update({ phase: 'transcribing', percent: 42.6 })
    expect(useTranscriptionProgressStore.getState().run?.percent).toBe(43)

    store.update({ phase: 'transcribing', percent: 400 })
    expect(useTranscriptionProgressStore.getState().run?.percent).toBe(100)
  })

  it('ignores progress that arrives after the run ended', () => {
    const store = useTranscriptionProgressStore.getState()
    store.begin('audio-1', 'voice.m4a')
    store.end()

    store.update({ phase: 'transcribing', percent: 50 })

    expect(useTranscriptionProgressStore.getState().run).toBeNull()
  })
})
