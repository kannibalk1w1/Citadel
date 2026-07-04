import { create } from 'zustand'
import { nanoid } from 'nanoid'

export const TOAST_LIFETIME_MS = 2600
export const TOAST_MAX_STACK = 3

export type InscriptionToast = {
  id: string
  text: string
}

type InscriptionToastState = {
  toasts: InscriptionToast[]
  inscribe: (text: string) => void
  dismiss: (id: string) => void
}

// Verbal confirmations ("Archive opened") — feature code calls inscribe();
// only InscriptionToasts.tsx renders the stack.
export const useInscriptionToastStore = create<InscriptionToastState>((set) => ({
  toasts: [],

  inscribe: (text) => {
    const toast: InscriptionToast = { id: nanoid(), text }
    set((s) => ({ toasts: [...s.toasts, toast].slice(-TOAST_MAX_STACK) }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }))
    }, TOAST_LIFETIME_MS)
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function inscribe(text: string): void {
  useInscriptionToastStore.getState().inscribe(text)
}
