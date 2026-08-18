import { describe, expect, it } from 'vitest'
import {
  COLOUR_BLIND_MATRICES,
  SQUINT_BLUR_PX,
  VISION_MODES,
  isColourBlindMode,
  isVisionActive,
  nextVisionMode,
  visionFilter,
  visionFilterId,
  visionInteractive,
  visionModeLabel,
  visionStatusLabel,
  visionTransform,
  type VisionMode,
} from './visionModes'

describe('vision filters', () => {
  /**
   * The assertion below reads `blur(${SQUINT_BLUR_PX}px)` on both sides, so it
   * holds even when the constant is 0 — the squint check would blur nothing and
   * stay green. The point of the check is that a composition stops resolving,
   * so the amount is the behaviour and needs its own bound.
   */
  it('blurs enough for a squint test to mean anything', () => {
    expect(SQUINT_BLUR_PX).toBeGreaterThanOrEqual(4)
    expect(SQUINT_BLUR_PX).toBeLessThanOrEqual(24)
    expect(visionFilter('squint')).not.toBe('blur(0px)')
    expect(visionFilter('squint')).not.toBe(visionFilter('none'))
  })

  it('turns value and squint into plain CSS', () => {
    expect(visionFilter('value')).toBe('grayscale(1)')
    expect(visionFilter('squint')).toBe(`blur(${SQUINT_BLUR_PX}px)`)
  })

  it('points the colour-blindness modes at their own SVG matrix', () => {
    for (const mode of ['deuteranopia', 'protanopia', 'tritanopia'] as const) {
      expect(isColourBlindMode(mode)).toBe(true)
      expect(visionFilterId(mode)).toBe(`citadel-vision-${mode}`)
      expect(visionFilter(mode)).toBe(`url(#citadel-vision-${mode})`)
      expect(COLOUR_BLIND_MATRICES[mode]).toBeTruthy()
    }
  })

  it('leaves the board alone when nothing is on', () => {
    expect(visionFilter('none')).toBe('')
    expect(visionTransform(false)).toBe('')
    expect(visionInteractive(false)).toBe(true)
    expect(isVisionActive('none', false)).toBe(false)
  })

  it('describes every mode it offers', () => {
    for (const entry of VISION_MODES) {
      expect(entry.label).toBeTruthy()
      expect(entry.hint).toBeTruthy()
      expect(visionModeLabel(entry.id)).toBe(entry.label)
    }
  })

  it('writes matrices SVG will accept — four rows of five numbers', () => {
    for (const matrix of Object.values(COLOUR_BLIND_MATRICES)) {
      const values = matrix.trim().split(/\s+/)
      expect(values).toHaveLength(20)
      for (const value of values) expect(Number.isFinite(Number(value))).toBe(true)
    }
  })
})

describe('mirroring', () => {
  it('flips horizontally and holds the board still', () => {
    expect(visionTransform(true)).toBe('scaleX(-1)')
    // Konva reads pointer positions from the container's box, which a CSS flip
    // does not tell it about, so a drag would run away from the cursor.
    expect(visionInteractive(true)).toBe(false)
    expect(isVisionActive('none', true)).toBe(true)
  })
})

describe('status label', () => {
  it('says nothing when the board is its normal self', () => {
    expect(visionStatusLabel('none', false)).toBeNull()
  })

  it('names the check, and warns that a mirrored board does not respond', () => {
    expect(visionStatusLabel('value', false)).toBe('Value check')
    expect(visionStatusLabel('none', true)).toBe('Mirrored — board held still')
    expect(visionStatusLabel('squint', true)).toBe('Squint check · Mirrored — board held still')
  })
})

describe('cycling', () => {
  it('steps through every mode and returns to normal', () => {
    const seen: VisionMode[] = []
    let mode: VisionMode = 'none'
    for (let i = 0; i < VISION_MODES.length; i += 1) {
      mode = nextVisionMode(mode)
      seen.push(mode)
    }
    expect(new Set(seen).size).toBe(VISION_MODES.length)
    expect(mode).toBe('none')
  })
})
