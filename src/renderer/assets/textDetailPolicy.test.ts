import { describe, expect, it } from 'vitest'
import { preferTextSilhouette, TEXT_SILHOUETTE_MIN_SCREEN_FONT_PX } from './textDetailPolicy'

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
