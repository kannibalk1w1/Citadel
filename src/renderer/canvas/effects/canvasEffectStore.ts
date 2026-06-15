import { nanoid } from 'nanoid'
import { create } from 'zustand'
import {
  CANVAS_EFFECTS,
  type CanvasEffectKind,
  type CanvasPoint,
  reducedCanvasEffect,
} from './canvasEffectModel'

export type ActiveCanvasEffect = {
  id: string
  kind: CanvasEffectKind
  source?: CanvasPoint
  createdAt: number
  lifetimeMs: number
  color: string
  secondaryColor: string
  className: string
  intensity: number
  persistent?: boolean
}

type CanvasEffectState = {
  activeEffects: ActiveCanvasEffect[]
  lastCanvasPointer: CanvasPoint | null
  reducedMotion: boolean
  setLastCanvasPointer: (point: CanvasPoint | null) => void
  setReducedMotion: (reduced: boolean) => void
  triggerCanvasEffect: (kind: CanvasEffectKind, source?: CanvasPoint | null) => ActiveCanvasEffect
  clearCanvasEffect: (id: string) => void
  pruneExpired: (now?: number) => void
}

export const useCanvasEffectStore = create<CanvasEffectState>((set, get) => ({
  activeEffects: [],
  lastCanvasPointer: null,
  reducedMotion: false,

  setLastCanvasPointer: (point) => set({ lastCanvasPointer: point }),
  setReducedMotion: (reduced) => set({ reducedMotion: reduced }),

  triggerCanvasEffect: (kind, source) => {
    const resolvedKind = get().reducedMotion ? reducedCanvasEffect(kind) : kind
    const definition = CANVAS_EFFECTS[resolvedKind]
    const effect: ActiveCanvasEffect = {
      id: nanoid(),
      kind: definition.kind,
      source: source ?? undefined,
      createdAt: Date.now(),
      lifetimeMs: definition.lifetimeMs,
      color: definition.color,
      secondaryColor: definition.secondaryColor,
      className: definition.className,
      intensity: definition.intensity,
      persistent: definition.persistent,
    }

    set((state) => ({
      activeEffects: [
        ...state.activeEffects.filter((active) => !(active.persistent && active.kind === effect.kind)),
        effect,
      ].slice(-24),
    }))

    return effect
  },

  clearCanvasEffect: (id) => {
    set((state) => ({ activeEffects: state.activeEffects.filter((effect) => effect.id !== id) }))
  },

  pruneExpired: (now = Date.now()) => {
    set((state) => ({
      activeEffects: state.activeEffects.filter((effect) => (
        effect.persistent || now - effect.createdAt <= effect.lifetimeMs
      )),
    }))
  },
}))
