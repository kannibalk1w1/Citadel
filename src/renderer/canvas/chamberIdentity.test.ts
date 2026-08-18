import { describe, expect, it } from 'vitest'
import type { CanvasBoard } from '../../types'
import {
  CHAMBER_MOOD_PRESETS,
  chamberAccentVariables,
  chamberIdentityEvent,
  resolveChamberIdentity,
} from './chamberIdentity'

function board(meta?: Record<string, unknown>): CanvasBoard {
  return { id: 'b1', name: 'Chamber', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 }, meta }
}

describe('CHAMBER_MOOD_PRESETS', () => {
  it('keeps the four shipped mood ids and adds two new ones', () => {
    const ids = CHAMBER_MOOD_PRESETS.map((p) => p.id)
    expect(ids).toEqual(['gothic', 'ember', 'verdant', 'frost', 'umbral', 'aurum'])
  })

  it('every preset carries accent, dim, and glow tones', () => {
    for (const preset of CHAMBER_MOOD_PRESETS) {
      expect(preset.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(preset.accentDim).toMatch(/^#[0-9a-f]{6}$/i)
      expect(preset.accentGlow).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  /**
   * The check above only asks whether each mood has *a* colour, which every
   * mood would pass if they were all the same one — and two of them were.
   * "Neutral" was #73a8db and "Blue" #78a9d6, seven units apart in RGB, so
   * picking between them changed nothing anybody could see. A mood is a colour;
   * if two moods share it, one of them is dead.
   */
  it('gives every mood a colour distinct from the others', () => {
    const rgb = (hex: string): [number, number, number] => [
      parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
    ]
    const distance = (a: string, b: string): number => {
      const [ar, ag, ab] = rgb(a)
      const [br, bg, bb] = rgb(b)
      return Math.hypot(ar - br, ag - bg, ab - bb)
    }

    // 40 is roughly where two swatches stop being tellable apart side by side.
    const tooClose = CHAMBER_MOOD_PRESETS.flatMap((a, i) =>
      CHAMBER_MOOD_PRESETS.slice(i + 1)
        .filter((b) => distance(a.accent, b.accent) <= 40)
        .map((b) => `${a.label} (${a.accent}) vs ${b.label} (${b.accent})`))

    // Named rather than counted, so a failure says which two moods collided.
    expect(tooClose).toEqual([])
  })
})

describe('resolveChamberIdentity', () => {
  it('defaults to the current look for a bare board', () => {
    const identity = resolveChamberIdentity(board())
    expect(identity).toEqual({
      mood: 'gothic',
      accent: CHAMBER_MOOD_PRESETS[0].accent,
      ambience: 'none',
      ambienceIntensity: 0.5,
      vignette: 0,
      glow: 0,
      texture: undefined,
    })
  })

  it('honours a stored mood and its preset accent', () => {
    const identity = resolveChamberIdentity(board({ mood: 'ember' }))
    expect(identity.mood).toBe('ember')
    expect(identity.accent).toBe(CHAMBER_MOOD_PRESETS.find((p) => p.id === 'ember')!.accent)
  })

  it('lets meta.accent override the preset accent', () => {
    expect(resolveChamberIdentity(board({ mood: 'ember', accent: '#123456' })).accent).toBe('#123456')
  })

  it('falls back to gothic for unknown moods', () => {
    expect(resolveChamberIdentity(board({ mood: 'disco' })).mood).toBe('gothic')
  })

  it('clamps dials into 0..1', () => {
    const identity = resolveChamberIdentity(board({ ambience: 'motes', ambienceIntensity: 7, vignette: -2, glow: 0.4 }))
    expect(identity.ambience).toBe('motes')
    expect(identity.ambienceIntensity).toBe(1)
    expect(identity.vignette).toBe(0)
    expect(identity.glow).toBe(0.4)
  })

  it('normalizes a texture override and drops pathless ones', () => {
    const withTexture = resolveChamberIdentity(board({ texture: { assetPath: 'C:/tile.png', opacity: 3, scale: 0.1, repeat: false } }))
    expect(withTexture.texture).toEqual({ assetPath: 'C:/tile.png', opacity: 1, scale: 0.25, repeat: false })
    expect(resolveChamberIdentity(board({ texture: { opacity: 0.5 } })).texture).toBeUndefined()
  })
})

describe('chamberAccentVariables', () => {
  it('exposes the three chamber CSS variables', () => {
    const identity = resolveChamberIdentity(board({ mood: 'frost' }))
    const vars = chamberAccentVariables(identity)
    expect(vars['--chamber-accent']).toBe(identity.accent)
    expect(vars['--chamber-accent-dim']).toMatch(/^#/)
    expect(vars['--chamber-accent-glow']).toMatch(/^#/)
  })

  it('keeps dim/glow from the preset even when accent is overridden', () => {
    const identity = resolveChamberIdentity(board({ mood: 'frost', accent: '#123456' }))
    const preset = CHAMBER_MOOD_PRESETS.find((p) => p.id === 'frost')!
    expect(chamberAccentVariables(identity)['--chamber-accent-dim']).toBe(preset.accentDim)
  })
})

describe('chamberIdentityEvent', () => {
  it('captures before/after for only the touched keys', () => {
    const event = chamberIdentityEvent(board({ mood: 'ember', vignette: 0.8 }), { mood: 'frost' })
    expect(event.after).toEqual({ mood: 'frost' })
    expect(event.before).toEqual({ mood: 'ember' })
  })

  it('records explicit defaults for keys missing from meta so undo restores the old look', () => {
    const event = chamberIdentityEvent(board(), { ambience: 'fog', glow: 0.6 })
    expect(event.before).toEqual({ ambience: 'none', glow: 0 })
    expect(event.after).toEqual({ ambience: 'fog', glow: 0.6 })
  })

  it('uses null before for texture so undo can clear an added override', () => {
    const event = chamberIdentityEvent(board(), { texture: { assetPath: 'C:/t.png', opacity: 1, scale: 1, repeat: true } })
    expect(event.before).toEqual({ texture: null })
  })
})
