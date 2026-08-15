// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { canvasColor, canvasColors, refreshCanvasColors } from './canvasColors'

afterEach(() => {
  document.documentElement.style.removeProperty('--accent')
  document.documentElement.style.removeProperty('--text-primary')
  refreshCanvasColors()
})

describe('canvasColors', () => {
  it('reads theme variables off the document element', () => {
    document.documentElement.style.setProperty('--accent', '#123456')

    refreshCanvasColors()

    expect(canvasColor('accent')).toBe('#123456')
  })

  it('picks up a custom palette override after a refresh', () => {
    document.documentElement.style.setProperty('--text-primary', '#abcdef')
    refreshCanvasColors()
    expect(canvasColor('textPrimary')).toBe('#abcdef')

    document.documentElement.style.setProperty('--text-primary', '#fedcba')
    expect(canvasColor('textPrimary')).toBe('#abcdef')  // stale until refreshed

    refreshCanvasColors()
    expect(canvasColor('textPrimary')).toBe('#fedcba')
  })

  it('falls back to the shipped palette when a variable is unset', () => {
    refreshCanvasColors()

    // Never empty, and never the browser default black the canvas would
    // otherwise fall back to.
    for (const value of Object.values(canvasColors())) {
      expect(value).not.toBe('')
      expect(value).not.toBe('#000000')
    }
  })

  it('survives being called without a document', () => {
    expect(() => refreshCanvasColors(null)).not.toThrow()
    expect(canvasColor('accent')).toBe('#c8a96e')
  })
})
