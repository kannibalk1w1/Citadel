import { create } from 'zustand'

// Electron does not implement window.prompt ("prompt() is and will not be
// supported"), so every text ask goes through this store + the
// InscriptionPrompt modal instead.

type PromptRequest = {
  title: string
  initial: string
  resolve: (value: string | null) => void
}

type InscriptionPromptState = {
  request: PromptRequest | null
  ask: (title: string, initial?: string) => Promise<string | null>
  submit: (value: string) => void
  cancel: () => void
}

export const useInscriptionPromptStore = create<InscriptionPromptState>((set, get) => ({
  request: null,

  ask: (title, initial = '') => {
    get().request?.resolve(null)
    return new Promise<string | null>((resolve) => {
      set({ request: { title, initial, resolve } })
    })
  },

  submit: (value) => {
    get().request?.resolve(value)
    set({ request: null })
  },

  cancel: () => {
    get().request?.resolve(null)
    set({ request: null })
  },
}))

export function askInscription(title: string, initial = ''): Promise<string | null> {
  return useInscriptionPromptStore.getState().ask(title, initial)
}
