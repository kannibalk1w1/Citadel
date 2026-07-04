import type { ChamberAmbienceKind } from './chamberIdentity'

export const AMBIENCE_MAX_MOTES = 14
export const AMBIENCE_MIN_MOTES = 4

export type AmbienceElement = {
  kind: 'mote' | 'fog-band' | 'static-wash'
  leftPct: number
  topPct: number
  sizePx: number
  durationMs: number
  delayMs: number
  opacity: number
}

// Deterministic pseudo-random placement: ambience must render identically
// across mounts so React reconciliation and tests stay stable.
function placed(index: number): { leftPct: number; topPct: number } {
  const golden = 0.61803398875
  return {
    leftPct: Math.round(((index * golden) % 1) * 100),
    topPct: Math.round((((index * golden * 7) + 0.31) % 1) * 100),
  }
}

export function ambienceElements(
  kind: ChamberAmbienceKind,
  intensity: number,
  reducedMotion: boolean,
): AmbienceElement[] {
  if (kind === 'none') return []

  if (reducedMotion) {
    return [{
      kind: 'static-wash',
      leftPct: 0,
      topPct: 0,
      sizePx: 0,
      durationMs: 1,
      delayMs: 0,
      opacity: 0.12 + intensity * 0.18,
    }]
  }

  if (kind === 'fog') {
    return [0, 1].map((index) => ({
      kind: 'fog-band' as const,
      leftPct: 0,
      topPct: index === 0 ? 22 : 61,
      sizePx: 220,
      durationMs: 52000 + index * 17000,
      delayMs: index * 9000,
      opacity: 0.05 + intensity * 0.13,
    }))
  }

  const count = Math.round(AMBIENCE_MIN_MOTES + (AMBIENCE_MAX_MOTES - AMBIENCE_MIN_MOTES) * Math.max(0, Math.min(1, intensity)))
  return Array.from({ length: count }, (_, index) => {
    const { leftPct, topPct } = placed(index)
    return {
      kind: 'mote' as const,
      leftPct,
      topPct,
      sizePx: 2 + (index % 3),
      durationMs: 14000 + (index % 5) * 3600,
      delayMs: (index % 7) * 1900,
      opacity: 0.25 + intensity * 0.35,
    }
  })
}
