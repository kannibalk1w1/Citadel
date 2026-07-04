import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasEffectStore } from './canvasEffectStore'

describe('canvasEffectStore', () => {
  beforeEach(() => {
    useCanvasEffectStore.setState({
      activeEffects: [],
      lastCanvasPointer: null,
      reducedMotion: false,
    })
  })

  it('stores the last canvas pointer for fallback source placement', () => {
    useCanvasEffectStore.getState().setLastCanvasPointer({ x: 42, y: 99 })

    expect(useCanvasEffectStore.getState().lastCanvasPointer).toEqual({ x: 42, y: 99 })
  })

  it('enqueues canvas effects with explicit source coordinates', () => {
    const effect = useCanvasEffectStore.getState().triggerCanvasEffect('delete-red-flame', { x: 10, y: 20 })

    expect(effect.kind).toBe('delete-red-flame')
    expect(effect.source).toEqual({ x: 10, y: 20 })
    expect(useCanvasEffectStore.getState().activeEffects).toHaveLength(1)
  })

  it('uses the reduced pulse for transient effects when reduced motion is active', () => {
    useCanvasEffectStore.getState().setReducedMotion(true)

    const effect = useCanvasEffectStore.getState().triggerCanvasEffect('save-blue-flame', { x: 10, y: 20 })

    expect(effect.kind).toBe('reduced-pulse')
  })

  it('prunes completed non-persistent effects by lifetime', () => {
    vi.setSystemTime(10_000)
    const effect = useCanvasEffectStore.getState().triggerCanvasEffect('import-yellow-spark', { x: 0, y: 0 })
    vi.setSystemTime(10_000 + effect.lifetimeMs + 1)

    useCanvasEffectStore.getState().pruneExpired(Date.now())

    expect(useCanvasEffectStore.getState().activeEffects).toEqual([])
    vi.useRealTimers()
  })
})
