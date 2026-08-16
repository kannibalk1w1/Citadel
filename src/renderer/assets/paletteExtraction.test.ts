import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../types'
import { paletteSourceConnection, paletteSwatchForImage, quantizePalette } from './paletteExtraction'

const image: CanvasItem = {
  id: 'image-1', type: 'image', x: 100, y: 200, width: 400, height: 300,
  rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [], src: '/references/still.png',
}

describe('quantizePalette', () => {
  it('finds the dominant opaque colours and ignores transparent pixels', () => {
    const pixels = new Uint8ClampedArray([
      240, 20, 30, 255,
      240, 20, 30, 255,
      20, 40, 220, 255,
      1, 2, 3, 0,
    ])

    expect(quantizePalette(pixels, 2)).toEqual(['#f0141e', '#1428dc'])
  })

  it('returns no colour for a fully transparent image', () => {
    expect(quantizePalette(new Uint8ClampedArray([120, 130, 140, 0]))).toEqual([])
  })
})

describe('palette artifacts', () => {
  it('places a swatch beside its image and records a source connection back to it', () => {
    const swatch = paletteSwatchForImage(image, ['#112233', '#abcdef'], 'swatch-1')
    const connection = paletteSourceConnection(swatch.id, image.id, '#73a8db', 'connection-1')

    expect(swatch).toMatchObject({
      id: 'swatch-1', type: 'swatch', x: 524, y: 200, meta: { colors: ['#112233', '#abcdef'] },
    })
    expect(connection).toMatchObject({
      id: 'connection-1', fromId: 'swatch-1', toId: 'image-1', meaning: 'source', arrowHead: 'arrow',
    })
  })
})
