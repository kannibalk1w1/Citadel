import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  isThemePreset,
  themeOverrideKeys,
  themePresetColors,
  themePresetLabels,
  themePresets,
  type ThemeOverrideKey,
  type ThemePreset,
} from '../store/uiStore'

/**
 * A preset is three things that have to agree: a block of CSS variables, a
 * swatch in Settings, and a name a person reads. They are declared in two files
 * and nothing but this test connects them.
 *
 * They had already drifted. The palette moved off aged gold to a blue accent in
 * dark.css, while the Citadel swatch kept handing out #c8a96e — so choosing the
 * preset named after the default theme repainted the app in a colour the app no
 * longer uses.
 */
const themeDir = __dirname

/** Where each preset's tokens actually live. The default theme is the bare :root. */
const PRESET_SOURCES: Record<ThemePreset, { file: string; selector: string }> = {
  citadel: { file: 'dark.css', selector: ':root' },
  graphite: { file: 'graphite.css', selector: 'html[data-theme="graphite"]' },
  terminal: { file: 'terminal.css', selector: 'html[data-theme="terminal"]' },
  light: { file: 'light.css', selector: 'html[data-theme="light"]' },
}

const TOKEN_FOR: Record<ThemeOverrideKey, string> = {
  canvas: '--bg-canvas',
  ui: '--bg-ui',
  panel: '--bg-panel',
  text: '--text-primary',
  accent: '--accent',
}

function declaredTokens(preset: ThemePreset): Record<string, string> {
  const { file, selector } = PRESET_SOURCES[preset]
  const css = readFileSync(join(themeDir, file), 'utf-8')
  const start = css.indexOf(`${selector} {`)
  const block = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries(
    [...block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  )
}

describe('every theme preset is complete', () => {
  it.each(themePresets)('%s has a stylesheet, a swatch and a name', (preset) => {
    expect(PRESET_SOURCES[preset], `${preset} has no stylesheet mapped`).toBeDefined()
    expect(themePresetLabels[preset]).toBeTruthy()
    expect(themePresetColors[preset]).toBeDefined()
    expect(Object.keys(declaredTokens(preset)).length).toBeGreaterThan(10)
  })

  it.each(themePresets)('%s declares every token a theme is allowed to move', (preset) => {
    const tokens = declaredTokens(preset)
    const missing = Object.values(TOKEN_FOR).filter((token) => !(token in tokens))

    expect(missing, `${preset} does not declare ${missing.join(', ')}`).toEqual([])
  })

  it.each(themePresets)('%s swatch shows the colour the stylesheet actually paints', (preset) => {
    const tokens = declaredTokens(preset)
    const mismatched = themeOverrideKeys
      .filter((key) => themePresetColors[preset][key].toLowerCase() !== tokens[TOKEN_FOR[key]].toLowerCase())
      .map((key) => `${TOKEN_FOR[key]}: css has ${tokens[TOKEN_FOR[key]]}, swatch has ${themePresetColors[preset][key]}`)

    expect(mismatched).toEqual([])
  })

  it('loads every preset stylesheet at startup, or the swatch paints nothing', () => {
    const main = readFileSync(join(themeDir, '..', 'main.tsx'), 'utf-8')

    for (const preset of themePresets) {
      expect(main, `${PRESET_SOURCES[preset].file} is never imported`).toContain(PRESET_SOURCES[preset].file)
    }
  })
})

describe('a saved theme survives a restart', () => {
  /**
   * The validator that guards `ui.theme` on load held its own hardcoded list of
   * three names. Terminal was rejected by it, so the app started on the default
   * however many times a person chose otherwise: the setting was written, read
   * back, and thrown away. It reads the preset list now.
   */
  it.each(themePresets)('accepts %s, which is a preset the app actually offers', (preset) => {
    expect(isThemePreset(preset)).toBe(true)
  })

  it('rejects anything that is not one', () => {
    expect(isThemePreset('ref-flow')).toBe(false)
    expect(isThemePreset('')).toBe(false)
    expect(isThemePreset(undefined)).toBe(false)
  })
})

describe('a theme out-specifies the default', () => {
  /**
   * `:root` and `[data-theme="x"]` have the same specificity, so which one wins
   * is decided by which stylesheet the browser loads last. That is Vite's
   * decision, and it changed the moment dark.css gained a second importer: the
   * Stop window made it a shared chunk, the HTML linked it after the themes,
   * and every theme silently stopped applying in packaged builds. Dev was fine,
   * and no unit test noticed, because both need a production build to differ.
   *
   * `html[data-theme="x"]` carries one more element than `:root`, so it wins
   * wherever it lands in the cascade.
   */
  it.each(themePresets.filter((preset) => preset !== 'citadel'))('%s is scoped to html, not to the bare attribute', (preset) => {
    const { file } = PRESET_SOURCES[preset]
    const css = readFileSync(join(themeDir, file), 'utf-8')

    expect(css).not.toMatch(/(?<!html)\[data-theme=/)
    expect(css).toContain(`html[data-theme="${preset}"] {`)
  })

  it('leaves the default on :root, which is what the themes have to beat', () => {
    const css = readFileSync(join(themeDir, 'dark.css'), 'utf-8')
    expect(css).toMatch(/^:root \{/m)
  })
})

describe('the Terminal preset', () => {
  const tokens = declaredTokens('terminal')

  it('carries the phosphor green through every accent role', () => {
    expect(tokens['--accent']).toBe('#36e07a')
    expect(tokens['--text-accent']).toBe('#36e07a')
    expect(tokens['--accent-soft']).toContain('54, 224, 122')
  })

  it('keeps the board ground near-neutral, as the default theme does', () => {
    // A strong cast on the canvas shifts how every reference image reads, which
    // is the one thing a palette swap must not do.
    const [red, green, blue] = [1, 3, 5].map((at) => parseInt(tokens['--canvas-flat'].slice(at, at + 2), 16))
    expect(Math.max(red, green, blue) - Math.min(red, green, blue)).toBeLessThanOrEqual(12)
  })

  it('changes no font, spacing or layout token', () => {
    const css = readFileSync(join(themeDir, 'terminal.css'), 'utf-8')

    for (const token of ['--font-', '--space-', '--text-xs', '--radius-', '--topbar-h', '--archive-rail-w']) {
      expect(css, `terminal.css moves ${token}, which is beyond a palette`).not.toContain(token)
    }
  })
})
