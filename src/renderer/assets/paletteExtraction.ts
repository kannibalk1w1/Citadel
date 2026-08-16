import { nanoid } from 'nanoid'
import type { CanvasItem, Connection } from '../../types'
import { getAssetMetadata } from './assetMetadata'
import { ensureThumbnail } from './thumbnailPipeline'
import { pathToUrl } from '../utils/pathToUrl'

type Rgb = readonly [number, number, number]

type ColourBucket = {
  colors: Rgb[]
  channel: number
  range: number
}

const PALETTE_SIZE = 5
const MIN_ALPHA = 128

function hex([red, green, blue]: Rgb): string {
  return `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`
}

function bucketFor(colors: Rgb[]): ColourBucket {
  const ranges = [0, 1, 2].map((channel) => {
    const values = colors.map((color) => color[channel])
    return Math.max(...values) - Math.min(...values)
  })
  const range = Math.max(...ranges)
  return { colors, channel: ranges.indexOf(range), range }
}

function mean(colors: Rgb[]): Rgb {
  const total = colors.reduce<[number, number, number]>(
    (sum, color) => [sum[0] + color[0], sum[1] + color[1], sum[2] + color[2]],
    [0, 0, 0],
  )
  return [total[0] / colors.length, total[1] / colors.length, total[2] / colors.length]
}

/**
 * Median-cut quantisation for a small, representative image palette. Alpha is
 * respected so transparent margins and checkerboards do not become colours.
 */
export function quantizePalette(pixels: Uint8ClampedArray, maxColors = PALETTE_SIZE): string[] {
  const colors: Rgb[] = []
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    if (pixels[offset + 3] >= MIN_ALPHA) colors.push([pixels[offset], pixels[offset + 1], pixels[offset + 2]])
  }
  if (colors.length === 0 || maxColors < 1) return []

  const buckets = [bucketFor(colors)]
  while (buckets.length < maxColors) {
    const index = buckets.reduce((best, bucket, current) => {
      const candidate = buckets[best]
      const candidateScore = candidate.range * candidate.colors.length
      const score = bucket.range * bucket.colors.length
      return bucket.colors.length > 1 && score > candidateScore ? current : best
    }, 0)
    const bucket = buckets[index]
    if (!bucket || bucket.colors.length < 2 || bucket.range === 0) break
    const sorted = [...bucket.colors].sort((a, b) => a[bucket.channel] - b[bucket.channel])
    const middle = Math.floor(sorted.length / 2)
    buckets.splice(index, 1, bucketFor(sorted.slice(0, middle)), bucketFor(sorted.slice(middle)))
  }

  const seen = new Set<string>()
  return buckets
    .sort((a, b) => b.colors.length - a.colors.length)
    .map((bucket) => hex(mean(bucket.colors)))
    .filter((color) => !seen.has(color) && (seen.add(color), true))
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be decoded'))
    image.src = src
  })
}

/**
 * Pull from the already-generated thumbnail when possible. It keeps palette
 * extraction inexpensive and leaves the renderer's file-access boundary intact.
 */
export async function extractImagePalette(src: string): Promise<string[]> {
  await ensureThumbnail(src)
  const preview = getAssetMetadata(src)?.thumbnailPath ?? src
  const image = await loadImage(pathToUrl(preview))
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || canvas.width < 1 || canvas.height < 1) throw new Error('Image pixels are unavailable')
  context.drawImage(image, 0, 0)
  return quantizePalette(context.getImageData(0, 0, canvas.width, canvas.height).data)
}

export function paletteSwatchForImage(image: CanvasItem, colors: string[], id = nanoid()): CanvasItem {
  return {
    id,
    type: 'swatch',
    x: image.x + image.width + 24,
    y: image.y,
    width: 300,
    height: 80,
    rotation: 0,
    zIndex: Date.now(),
    locked: false,
    visible: true,
    opacity: 1,
    tags: [],
    meta: { colors },
  }
}

export function paletteSourceConnection(swatchId: string, imageId: string, color: string, id = nanoid()): Connection {
  return {
    id,
    fromId: swatchId,
    toId: imageId,
    fromAnchor: 'auto',
    toAnchor: 'auto',
    style: 'bezier',
    color,
    width: 1.5,
    arrowHead: 'arrow',
    meaning: 'source',
    dashed: false,
  }
}
