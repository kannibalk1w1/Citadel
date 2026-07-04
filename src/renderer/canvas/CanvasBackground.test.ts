import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CANVAS_TEXTURE_TILE_SIZE,
  buildDefaultCanvasBackgroundStyle,
  defaultCanvasTextureUrl,
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
})
