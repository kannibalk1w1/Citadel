// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMascotStore } from './mascotStore'
import { useCanvasEffectStore } from '../canvas/effects/canvasEffectStore'

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
  useMascotStore.setState({ effectQueue: [], activeEffect: null, persistentEffects: new Set() })
  useCanvasEffectStore.setState({ activeEffects: [] })
})

describe('mascotStore progress-fill coalescing', () => {
  it('coalesces rapid progress-fill ticks into a single queue entry and a single canvas flare', () => {
    for (let i = 0; i <= 100; i++) {
      useMascotStore.getState().triggerEffect('progress-fill', i / 100)
    }

    const { effectQueue } = useMascotStore.getState()
    expect(effectQueue).toHaveLength(1)
    expect(effectQueue[0]).toEqual({ name: 'progress-fill', progress: 1 })

    const { activeEffects } = useCanvasEffectStore.getState()
    expect(activeEffects).toHaveLength(1)
  })

  it('preserves interleaving with non-continuous effects', () => {
    useMascotStore.getState().triggerEffect('progress-fill', 0.2)
    useMascotStore.getState().triggerEffect('lightning-out')
    useMascotStore.getState().triggerEffect('progress-fill', 0.4)

    const names = useMascotStore.getState().effectQueue.map((e) => e.name)
    expect(names).toEqual(['progress-fill', 'lightning-out', 'progress-fill'])
  })

  it('coalesces the reduced-motion substitute too (same flood vector)', () => {
    // Under reduced motion, every trigger resolves to 'brightness-pulse'; a
    // rapid producer must not grow the queue through that path either.
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia

    for (let i = 0; i <= 100; i++) {
      useMascotStore.getState().triggerEffect('progress-fill', i / 100)
    }

    const { effectQueue } = useMascotStore.getState()
    expect(effectQueue).toHaveLength(1)
    expect(effectQueue[0]).toEqual({ name: 'brightness-pulse', progress: 1 })

    const { activeEffects } = useCanvasEffectStore.getState()
    expect(activeEffects).toHaveLength(1)
  })
})
