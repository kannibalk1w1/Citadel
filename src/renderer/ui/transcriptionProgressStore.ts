import { create } from 'zustand'
import type { TranscriptionProgress } from '../../types/transcription'

export type TranscriptionRun = {
  /** The audio item being transcribed, so a second run can replace the first. */
  itemId: string
  name: string
  phase: TranscriptionProgress['phase']
  percent: number
}

type TranscriptionProgressState = {
  run: TranscriptionRun | null
  begin: (itemId: string, name: string) => void
  update: (progress: TranscriptionProgress) => void
  end: () => void
}

/**
 * Drives the TranscriptionStatus card. Unlike an archive rite this deliberately
 * blocks nothing: transcribing a long note takes a minute, and a person should
 * be able to keep working on the board while it runs.
 */
export const useTranscriptionProgressStore = create<TranscriptionProgressState>((set, get) => ({
  run: null,

  begin: (itemId, name) => set({ run: { itemId, name, phase: 'decoding', percent: 0 } }),

  update: (progress) => {
    const run = get().run
    if (!run) return
    const percent = Math.round(Math.min(100, Math.max(0, progress.percent)))
    set({ run: { ...run, phase: progress.phase, percent } })
  },

  end: () => set({ run: null }),
}))

type IpcOn = { on?: (channel: string, listener: (...args: unknown[]) => void) => () => void }

/** Called once from App startup. Returns the unsubscribe function. */
export function registerTranscriptionProgressListener(): () => void {
  const ipc = (window as unknown as { ipc?: IpcOn }).ipc
  if (!ipc?.on) return () => {}
  return ipc.on('transcribe:progress', (payload) => {
    useTranscriptionProgressStore.getState().update(payload as TranscriptionProgress)
  })
}
