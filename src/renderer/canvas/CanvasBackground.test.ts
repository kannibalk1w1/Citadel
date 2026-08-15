import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CANVAS_TEXTURE_TILE_SIZE,
  buildDefaultCanvasBackgroundStyle,
  defaultCanvasTextureUrl,
  resolveEffectiveBackground,
  buildDotGridStyle,
  dotGridSpacing,
  MIN_DOT_SPACING_PX,
} from './CanvasBackground'

describe('CanvasBackground', () => {
  it('uses the bundled raster texture as the default canvas floor', () => {
    const style = buildDefaultCanvasBackgroundStyle({
      opacity: 0.62,
      scale: 1,
      viewportScale: 1,
      viewportX: -120,
      viewportY: 80,
    })

    expect(defaultCanvasTextureUrl).toMatch(/arcane-stone-canvas-tile\.png/)
    expect(style.backgroundImage).toContain(defaultCanvasTextureUrl)
    expect(style.backgroundRepeat).toBe('repeat')
    expect(style.backgroundPosition).toBe('-120px 80px')
  })

  it('scales the raster tile with the background scale and clamped viewport scale', () => {
    const style = buildDefaultCanvasBackgroundStyle({
      opacity: 0.62,
      scale: 1.5,
      viewportScale: 2,
      viewportX: 0,
      viewportY: 0,
    })

    expect(style.backgroundSize).toBe(`${DEFAULT_CANVAS_TEXTURE_TILE_SIZE * 1.5 * 1.35}px auto`)
  })

  it('lets a chamber texture override win over the global setting', () => {
    const resolved = resolveEffectiveBackground(
      { assetPath: 'C:/chamber-tile.png', opacity: 0.4, scale: 2, repeat: false },
      { mode: 'stone', assetPath: null, opacity: 0.62, scale: 1, repeat: true },
    )
    expect(resolved).toEqual({ mode: 'custom', assetPath: 'C:/chamber-tile.png', opacity: 0.4, scale: 2, repeat: false })
  })

  it('falls back to the global setting when the chamber has no texture', () => {
    const global = { mode: 'custom' as const, assetPath: 'C:/global.png', opacity: 0.5, scale: 1, repeat: true }
    expect(resolveEffectiveBackground(undefined, global)).toEqual(global)
  })
})

describe('dot grid', () => {
  it('spaces dots on the snap grid at 1:1', () => {
    expect(dotGridSpacing(40, 1)).toBe(40)
  })

  it('doubles spacing until dots stay legible when zoomed out', () => {
    // 40px grid at 0.2 zoom would put dots 8px apart on screen.
    expect(dotGridSpacing(40, 0.2)).toBeGreaterThanOrEqual(MIN_DOT_SPACING_PX)
    expect(dotGridSpacing(40, 0.2)).toBe(16)
  })

  it('keeps zoomed-in spacing exactly on the grid', () => {
    expect(dotGridSpacing(40, 2)).toBe(80)
  })

  it('survives a nonsense scale rather than dividing by zero', () => {
    expect(dotGridSpacing(40, 0)).toBe(MIN_DOT_SPACING_PX)
    expect(dotGridSpacing(40, Number.NaN)).toBe(MIN_DOT_SPACING_PX)
  })

  it('anchors the grid to the canvas origin so it pans with the board', () => {
    const style = buildDotGridStyle({ gridSize: 40, viewportScale: 1, viewportX: -120, viewportY: 64 })

    expect(style.backgroundPosition).toBe('-120px 64px')
    expect(style.backgroundSize).toBe('40px 40px')
    expect(style.backgroundImage).toContain('var(--canvas-dot)')
  })
})
