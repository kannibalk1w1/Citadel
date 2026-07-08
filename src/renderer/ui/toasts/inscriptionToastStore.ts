import { create } from 'zustand'
import { nanoid } from 'nanoid'

export const TOAST_LIFETIME_MS = 2600
export const TOAST_DANGER_LIFETIME_MS = 6000
export const TOAST_MAX_STACK = 3

export type InscribeTone = 'default' | 'danger'
export type InscribeOptions = { tone?: InscribeTone; lifetimeMs?: number }

export type InscriptionToast = {
  id: string
  text: string
  tone: InscribeTone
  lifetimeMs: number
}

type InscriptionToastState = {
  toasts: InscriptionToast[]
  inscribe: (text: string, options?: InscribeOptions) => void
  dismiss: (id: string) => void
}

// Verbal confirmations ("Archive opened") — feature code calls inscribe();
// only InscriptionToasts.tsx renders the stack.
export const useInscriptionToastStore = create<InscriptionToastState>((set) => ({
  toasts: [],

  inscribe: (text, options = {}) => {
    const tone = options.tone ?? 'default'
    const lifetimeMs = options.lifetimeMs ?? (tone === 'danger' ? TOAST_DANGER_LIFETIME_MS : TOAST_LIFETIME_MS)
    const toast: InscriptionToast = { id: nanoid(), text, tone, lifetimeMs }
    set((s) => ({ toasts: [...s.toasts, toast].slice(-TOAST_MAX_STACK) }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }))
    }, lifetimeMs)
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function inscribe(text: string, options?: InscribeOptions): void {
  useInscriptionToastStore.getState().inscribe(text, options)
}
