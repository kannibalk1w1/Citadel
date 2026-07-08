import { create } from 'zustand'
import type { CanvasPoint } from '../canvas/effects/canvasEffectModel'
import { canvasEffectForMascotEffect } from '../canvas/effects/canvasEffectModel'
import { useCanvasEffectStore } from '../canvas/effects/canvasEffectStore'

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

  triggerEffect: (name: MascotEffect, progress?: number, source?: CanvasPoint | null) => void
  clearEffect: (name: MascotEffect) => void
  consumeNextEffect: () => QueuedEffect | null
  setPosition: (x: number, y: number) => void
}

export const useMascotStore = create<MascotState>((set, get) => ({
  effectQueue: [],
  activeEffect: null,
  persistentEffects: new Set(),
  position: { x: 0, y: 0 },

  triggerEffect: (name, progress, source) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const effectName = reducedMotion ? 'brightness-pulse' : name

    // progress-fill (and its reduced-motion substitute brightness-pulse) is a
    // continuous value: a fast producer (e.g. archive export progress) can fire
    // dozens of ticks per second. Appending each tick to the queue unboundedly
    // grows it and can overflow React's nested-update limit in the queue
    // consumers. When the last queued entry is the same continuous effect,
    // replace it in place instead of appending, and skip firing another canvas
    // flare for that tick.
    const isPersistent = effectName === 'eye-open' || effectName === 'ember-drift'
    const coalesced = (effectName === 'progress-fill' || effectName === 'brightness-pulse')
      && get().effectQueue.at(-1)?.name === effectName

    useCanvasEffectStore.getState().setReducedMotion(reducedMotion)
    if (!coalesced) {
      const canvasEffect = canvasEffectForMascotEffect(effectName)
      if (canvasEffect) useCanvasEffectStore.getState().triggerCanvasEffect(canvasEffect.kind, source)
    }

    if (isPersistent) {
      set((s) => ({ persistentEffects: new Set([...s.persistentEffects, effectName]) }))
    } else if (coalesced) {
      set((s) => ({ effectQueue: [...s.effectQueue.slice(0, -1), { name: effectName, progress }] }))
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
