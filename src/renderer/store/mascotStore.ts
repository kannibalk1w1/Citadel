import { create } from 'zustand'

export type MascotEffect =
  | 'lightning-out'
  | 'lightning-in'
  | 'rune-seal'
  | 'base-pulse'
  | 'rewind-swirl'
  | 'forward-surge'
  | 'crumble'
  | 'eye-open'
  | 'eye-close'
  | 'lighthouse-beam'
  | 'progress-fill'
  | 'fracture'
  | 'rise-from-fog'
  | 'ember-drift'
  | 'banner-raise'
  | 'brightness-pulse'   // reduced-motion fallback

type QueuedEffect = {
  name: MascotEffect
  progress?: number        // 0–1, for progress-fill
}

type MascotState = {
  effectQueue: QueuedEffect[]
  activeEffect: QueuedEffect | null
  persistentEffects: Set<MascotEffect>
  position: { x: number; y: number }

  triggerEffect: (name: MascotEffect, progress?: number) => void
  clearEffect: (name: MascotEffect) => void
  consumeNextEffect: () => QueuedEffect | null
  setPosition: (x: number, y: number) => void
}

export const useMascotStore = create<MascotState>((set, get) => ({
  effectQueue: [],
  activeEffect: null,
  persistentEffects: new Set(),
  position: { x: 0, y: 0 },

  triggerEffect: (name, progress) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const effectName = reducedMotion ? 'brightness-pulse' : name

    const isPersistent = effectName === 'eye-open' || effectName === 'ember-drift'

    if (isPersistent) {
      set((s) => ({ persistentEffects: new Set([...s.persistentEffects, effectName]) }))
    } else {
      set((s) => ({ effectQueue: [...s.effectQueue, { name: effectName, progress }] }))
    }
  },

  clearEffect: (name) => {
    set((s) => {
      const next = new Set(s.persistentEffects)
      next.delete(name)
      return { persistentEffects: next }
    })
  },

  consumeNextEffect: () => {
    const { effectQueue } = get()
    if (effectQueue.length === 0) return null
    const [next, ...rest] = effectQueue
    set({ effectQueue: rest, activeEffect: next })
    return next
  },

  setPosition: (x, y) => set({ position: { x, y } }),
}))
