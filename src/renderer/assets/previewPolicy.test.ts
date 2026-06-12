import { describe, expect, it } from 'vitest'
import { preferThumbnail, THUMBNAIL_MAX_SIDE, thumbnailDimensions } from './previewPolicy'

describe('preferThumbnail', () => {
  it('uses the thumbnail when the on-screen size fits within thumbnail resolution', () => {
    expect(preferThumbnail(200, 150, false)).toBe(true)
    expect(preferThumbnail(THUMBNAIL_MAX_SIDE, THUMBNAIL_MAX_SIDE, false)).toBe(true)
  })

  it('uses the full image when the relic is larger on screen than the thumbnail', () => {
    expect(preferThumbnail(THUMBNAIL_MAX_SIDE + 1, 100, false)).toBe(false)
    expect(preferThumbnail(100, THUMBNAIL_MAX_SIDE + 1, false)).toBe(false)
  })

  it('always wakes the full image for selected relics', () => {
    expect(preferThumbnail(50, 50, true)).toBe(false)
  })
})

describe('thumbnailDimensions', () => {
  it('downscales the longest side to the max while preserving aspect', () => {
    expect(thumbnailDimensions(1024, 512, 256)).toEqual({ width: 256, height: 128 })
    expect(thumbnailDimensions(512, 1024, 256)).toEqual({ width: 128, height: 256 })
  })

  it('never upscales small images', () => {
    expect(thumbnailDimensions(100, 80, 256)).toEqual({ width: 100, height: 80 })
  })

  it('never returns zero dimensions', () => {
    expect(thumbnailDimensions(10000, 1, 256)).toEqual({ width: 256, height: 1 })
  })
})
