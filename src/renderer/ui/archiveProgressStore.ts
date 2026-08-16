import { create } from 'zustand'

export type ArchiveRiteOp = 'import' | 'export'
export type ArchiveRite = { op: ArchiveRiteOp; percent: number; label?: string }

type ArchiveProgressState = {
  rite: ArchiveRite | null
  beginRite: (op: ArchiveRiteOp) => void
  updateRite: (percent: number, label?: string) => void
  endRite: () => void
}

// Drives the ArchiveRiteOverlay during .citadelz import/export. Fed by the
// archive:progress IPC push channel; begin/end bracket the invoke in the flows.
export const useArchiveProgressStore = create<ArchiveProgressState>((set, get) => ({
  rite: null,

  beginRite: (op) => set({ rite: { op, percent: 0 } }),

  updateRite: (percent, label) => {
    const rite = get().rite
    if (!rite) return
    const clamped = Math.round(Math.min(100, Math.max(0, percent)))
    set({ rite: { ...rite, percent: clamped, label: label ?? rite.label } })
  },

  endRite: () => set({ rite: null }),
}))

type ProgressPayload = { op: ArchiveRiteOp; percent: number; label?: string }
type IpcOn = { on?: (channel: string, listener: (...args: unknown[]) => void) => () => void }

// Called once from App startup. Returns the unsubscribe function.
export function registerArchiveProgressListener(): () => void {
  const ipc = (window as unknown as { ipc?: IpcOn }).ipc
  if (!ipc?.on) return () => {}
  return ipc.on('archive:progress', (payload) => {
    const { percent, label } = payload as ProgressPayload
    useArchiveProgressStore.getState().updateRite(percent, label)
  })
}
