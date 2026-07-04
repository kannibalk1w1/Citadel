import { describe, expect, it } from 'vitest'
import { AMBIENCE_MAX_MOTES, ambienceElements } from './chamberAmbienceModel'

describe('ambienceElements', () => {
  it('returns nothing when ambience is off', () => {
    expect(ambienceElements('none', 1, false)).toEqual([])
    expect(ambienceElements('none', 1, true)).toEqual([])
  })

  it('caps motes at the fixed budget', () => {
    const elements = ambienceElements('motes', 1, false)
    expect(elements.length).toBeLessThanOrEqual(AMBIENCE_MAX_MOTES)
    expect(elements.every((e) => e.kind === 'mote')).toBe(true)
  })

  it('scales mote count with intensity but keeps a visible minimum', () => {
    const low = ambienceElements('motes', 0, false)
    const high = ambienceElements('motes', 1, false)
    expect(low.length).toBeGreaterThanOrEqual(4)
    expect(high.length).toBeGreaterThan(low.length)
  })

  it('is deterministic for a given input', () => {
    expect(ambienceElements('motes', 0.7, false)).toEqual(ambienceElements('motes', 0.7, false))
  })

  it('renders fog as exactly two bands', () => {
    const elements = ambienceElements('fog', 0.5, false)
    expect(elements.map((e) => e.kind)).toEqual(['fog-band', 'fog-band'])
  })

  it('degrades to a single static wash under reduced motion', () => {
    for (const kind of ['motes', 'fog'] as const) {
      const elements = ambienceElements(kind, 0.5, true)
      expect(elements.map((e) => e.kind)).toEqual(['static-wash'])
    }
  })

  it('gives every element position, size, duration, and delay', () => {
    for (const element of ambienceElements('motes', 1, false)) {
      expect(element.leftPct).toBeGreaterThanOrEqual(0)
      expect(element.leftPct).toBeLessThanOrEqual(100)
      expect(element.topPct).toBeGreaterThanOrEqual(0)
      expect(element.topPct).toBeLessThanOrEqual(100)
      expect(element.sizePx).toBeGreaterThan(0)
      expect(element.durationMs).toBeGreaterThan(0)
      expect(element.delayMs).toBeGreaterThanOrEqual(0)
    }
  })
})
