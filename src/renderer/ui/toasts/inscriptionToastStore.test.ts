import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  inscribe,
  TOAST_DANGER_LIFETIME_MS,
  TOAST_LIFETIME_MS,
  TOAST_MAX_STACK,
  useInscriptionToastStore,
} from './inscriptionToastStore'

describe('inscriptionToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useInscriptionToastStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('inscribes a toast with unique ids', () => {
    const { inscribe } = useInscriptionToastStore.getState()
    inscribe('Archive opened')
    inscribe('Board created')
    const toasts = useInscriptionToastStore.getState().toasts
    expect(toasts.map((t) => t.text)).toEqual(['Archive opened', 'Board created'])
    expect(new Set(toasts.map((t) => t.id)).size).toBe(2)
  })

  it('caps the stack by dropping the oldest', () => {
    const { inscribe } = useInscriptionToastStore.getState()
    for (let i = 0; i < TOAST_MAX_STACK + 2; i += 1) inscribe(`toast ${i}`)
    const toasts = useInscriptionToastStore.getState().toasts
    expect(toasts.length).toBe(TOAST_MAX_STACK)
    expect(toasts[0].text).toBe('toast 2')
  })

  it('auto-dismisses after its lifetime', () => {
    useInscriptionToastStore.getState().inscribe('Export inscribed (PDF)')
    expect(useInscriptionToastStore.getState().toasts.length).toBe(1)
    vi.advanceTimersByTime(TOAST_LIFETIME_MS + 50)
    expect(useInscriptionToastStore.getState().toasts.length).toBe(0)
  })

  it('dismisses a toast by id', () => {
    useInscriptionToastStore.getState().inscribe('The eye opens')
    const id = useInscriptionToastStore.getState().toasts[0].id
    useInscriptionToastStore.getState().dismiss(id)
    expect(useInscriptionToastStore.getState().toasts.length).toBe(0)
  })
})

describe('inscribe tones', () => {
  afterEach(() => {
    vi.useRealTimers()
    useInscriptionToastStore.setState({ toasts: [] })
  })

  it('defaults to the default tone and standard lifetime', () => {
    vi.useFakeTimers()
    inscribe('Archive opened')
    const toast = useInscriptionToastStore.getState().toasts[0]
    expect(toast.tone).toBe('default')
    expect(toast.lifetimeMs).toBe(TOAST_LIFETIME_MS)
    vi.advanceTimersByTime(TOAST_LIFETIME_MS + 1)
    expect(useInscriptionToastStore.getState().toasts).toEqual([])
  })

  it('danger tone lives longer and records its tone', () => {
    vi.useFakeTimers()
    inscribe('The archive resisted: too large', { tone: 'danger' })
    const toast = useInscriptionToastStore.getState().toasts[0]
    expect(toast.tone).toBe('danger')
    expect(toast.lifetimeMs).toBe(TOAST_DANGER_LIFETIME_MS)
    vi.advanceTimersByTime(TOAST_LIFETIME_MS + 1)
    expect(useInscriptionToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(TOAST_DANGER_LIFETIME_MS)
    expect(useInscriptionToastStore.getState().toasts).toEqual([])
  })
})
