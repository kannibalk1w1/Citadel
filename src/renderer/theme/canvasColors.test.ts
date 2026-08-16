// @vitest-environment jsdom
import { readFileSync } from 'fs'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CANVAS_COLOR_VARIABLES,
  CANVAS_FONT_VARIABLES,
  FALLBACKS,
  FONT_FALLBACKS,
  canvasColor,
  canvasColors,
  canvasFont,
  refreshCanvasColors,
  resolveCanvasColor,
  resolveCanvasFontFamily,
  resolveCanvasFontSize,
} from './canvasColors'

afterEach(() => {
  for (const token of ['--accent', '--text-primary', '--font-body', '--font-mono', '--text-xl']) {
    document.documentElement.style.removeProperty(token)
  }
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
    // The shipped accent, not a literal that can drift away from the palette.
    expect(canvasColor('accent')).toBe(FALLBACKS.accent)
  })
})

/**
 * The fallbacks are what the canvas paints before styles resolve and in any
 * test without a document, and the module promises they match dark.css. They
 * had already drifted: the palette moved to a blue accent while this list kept
 * handing out the old gold, so chrome could paint a colour the app no longer
 * uses. Parsing the stylesheet is the only way that promise stays true.
 */
describe('fallbacks match the shipped stylesheet', () => {
  const css = readFileSync(join(__dirname, 'dark.css'), 'utf-8')

  function declaredValue(token: string): string | null {
    const match = new RegExp(`${token}\\s*:\\s*([^;]+);`).exec(css)
    return match ? match[1].trim() : null
  }

  it('declares every canvas colour in dark.css, with the same value', () => {
    const mismatched: string[] = []
    for (const [name, token] of Object.entries(CANVAS_COLOR_VARIABLES)) {
      const declared = declaredValue(token)
      if (declared === null) {
        mismatched.push(`${token} is not declared in dark.css`)
        continue
      }
      const fallback = FALLBACKS[name as keyof typeof FALLBACKS]
      if (declared !== fallback) mismatched.push(`${token}: dark.css has ${declared}, fallback has ${fallback}`)
    }
    expect(mismatched).toEqual([])
  })

  it('declares every canvas type face in dark.css, with the same value', () => {
    const mismatched: string[] = []
    for (const [name, token] of Object.entries(CANVAS_FONT_VARIABLES)) {
      const declared = declaredValue(token)
      if (declared === null) {
        mismatched.push(`${token} is not declared in dark.css`)
        continue
      }
      const fallback = FONT_FALLBACKS[name as keyof typeof FONT_FALLBACKS]
      if (declared !== fallback) mismatched.push(`${token}: dark.css has ${declared}, fallback has ${fallback}`)
    }
    expect(mismatched).toEqual([])
  })
})

describe('canvasFont', () => {
  it('resolves type faces the same way it resolves colours', () => {
    document.documentElement.style.setProperty('--font-mono', "'Test Mono', monospace")
    refreshCanvasColors()
    expect(canvasFont('mono')).toBe("'Test Mono', monospace")
  })

  it('falls back to the shipped faces when unset', () => {
    refreshCanvasColors(null)
    expect(canvasFont('body')).toContain('Inter')
    expect(canvasFont('mono')).toContain('JetBrains Mono')
  })
})

/**
 * These guard the values that come out of saved projects. A `.citadel` written
 * before the canvas resolved its own tokens holds `var(--text-primary)` and
 * `var(--text-xl)` in item meta, and those files must keep opening correctly.
 */
describe('resolving values held in item meta', () => {
  it('resolves a stored CSS variable to a real colour', () => {
    document.documentElement.style.setProperty('--text-primary', '#abcdef')
    refreshCanvasColors()
    expect(resolveCanvasColor('var(--text-primary)', 'textPrimary')).toBe('#abcdef')
    expect(resolveCanvasColor('var( --text-primary )', 'textPrimary')).toBe('#abcdef')
  })

  it('passes literal colours straight through', () => {
    expect(resolveCanvasColor('#ff0000', 'textPrimary')).toBe('#ff0000')
    expect(resolveCanvasColor('rgba(1, 2, 3, 0.5)', 'textPrimary')).toBe('rgba(1, 2, 3, 0.5)')
    expect(resolveCanvasColor('chartreuse', 'textPrimary')).toBe('chartreuse')
  })

  it('falls back for anything missing or unknown', () => {
    refreshCanvasColors()
    expect(resolveCanvasColor(undefined, 'accent')).toBe(canvasColor('accent'))
    expect(resolveCanvasColor('', 'accent')).toBe(canvasColor('accent'))
    expect(resolveCanvasColor(42, 'accent')).toBe(canvasColor('accent'))
    expect(resolveCanvasColor('var(--not-a-real-token)', 'accent')).toBe(canvasColor('accent'))
  })

  it('never lets a var() through, whatever it is handed', () => {
    for (const input of ['var(--text-primary)', 'var(--nope)', 'var( --accent )']) {
      expect(resolveCanvasColor(input, 'accent')).not.toContain('var(')
      expect(resolveCanvasFontFamily(input, 'body')).not.toContain('var(')
    }
  })

  it('turns a stored font-size token into the number Konva needs', () => {
    document.documentElement.style.setProperty('--text-xl', '16px')
    refreshCanvasColors()

    expect(resolveCanvasFontSize('var(--text-xl)', 99)).toBe(16)
    expect(resolveCanvasFontSize(24, 99)).toBe(24)
    expect(resolveCanvasFontSize('18', 99)).toBe(18)
    expect(resolveCanvasFontSize('18px', 99)).toBe(18)
  })

  it('falls back rather than handing Konva something it cannot use', () => {
    expect(resolveCanvasFontSize(undefined, 16)).toBe(16)
    expect(resolveCanvasFontSize('not a size', 16)).toBe(16)
    expect(resolveCanvasFontSize(0, 16)).toBe(16)
    expect(resolveCanvasFontSize(-4, 16)).toBe(16)
    expect(resolveCanvasFontSize(Number.NaN, 16)).toBe(16)
    expect(resolveCanvasFontSize('var(--not-a-real-token)', 16)).toBe(16)
  })

  it('picks up a theme change on refresh, like the fixed palette does', () => {
    document.documentElement.style.setProperty('--text-primary', '#111111')
    refreshCanvasColors()
    expect(resolveCanvasColor('var(--text-primary)', 'textPrimary')).toBe('#111111')

    document.documentElement.style.setProperty('--text-primary', '#222222')
    refreshCanvasColors()
    expect(resolveCanvasColor('var(--text-primary)', 'textPrimary')).toBe('#222222')
  })
})
