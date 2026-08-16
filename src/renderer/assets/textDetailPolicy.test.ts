import { describe, expect, it } from 'vitest'
import {
  CODE_CARD_FONT_PX,
  preferCodeSilhouette,
  preferTextSilhouette,
  TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX,
} from './textDetailPolicy'

describe('preferTextSilhouette', () => {
  it('prefers silhouette when screen font size drops below the threshold', () => {
    expect(preferTextSilhouette(16, 0.1, false, false)).toBe(true) // 1.6px on screen
  })

  it('renders full text at readable screen font sizes', () => {
    expect(preferTextSilhouette(16, 1, false, false)).toBe(false) // 16px on screen
  })

  it('treats the threshold as the first readable size', () => {
    const scale = TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX / 16
    expect(preferTextSilhouette(16, scale, false, false)).toBe(false)
    expect(preferTextSilhouette(16, scale - 0.001, false, false)).toBe(true)
  })

  it('never silhouettes selected relics', () => {
    expect(preferTextSilhouette(16, 0.1, true, false)).toBe(false)
  })

  it('never silhouettes the relic being edited', () => {
    expect(preferTextSilhouette(16, 0.1, false, true)).toBe(false)
  })
})

describe('preferCodeSilhouette', () => {
  const threshold = TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX / CODE_CARD_FONT_PX

  it('silhouettes the card once the viewport passes the shared threshold', () => {
    expect(preferCodeSilhouette(threshold - 0.001, false, false)).toBe(true)
  })

  it('draws the full card at the threshold and above', () => {
    expect(preferCodeSilhouette(threshold, false, false)).toBe(false)
    expect(preferCodeSilhouette(1, false, false)).toBe(false)
  })

  // The card must not invent its own cutoff: one threshold across item types is
  // the whole reason this lives beside preferTextSilhouette.
  it('agrees with preferTextSilhouette at the card font size', () => {
    for (const scale of [0.05, 0.2, threshold - 0.001, threshold, 0.5, 1, 4]) {
      expect(preferCodeSilhouette(scale, false, false))
        .toBe(preferTextSilhouette(CODE_CARD_FONT_PX, scale, false, false))
    }
  })

  it('never silhouettes a selected card, however far out the viewport is', () => {
    expect(preferCodeSilhouette(0.01, true, false)).toBe(false)
  })

  it('never silhouettes the card being edited', () => {
    expect(preferCodeSilhouette(0.01, false, true)).toBe(false)
  })
})
