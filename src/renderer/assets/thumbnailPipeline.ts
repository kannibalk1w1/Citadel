import { pathToUrl } from '../utils/pathToUrl'
import { getAssetMetadata, isLocalAssetSrc, recordAssetMetadata } from './assetMetadata'
import { thumbnailDimensions } from './previewPolicy'

type IpcApi = { invoke: (channel: string, args?: unknown) => Promise<unknown> }
const getIpc = (): IpcApi => (window as unknown as { ipc: IpcApi }).ipc

type ThumbnailLookup = { exists: boolean; size?: number; mtimeMs?: number; thumbnailPath?: string | null }

export type ThumbnailGenerator = (src: string) => Promise<string>

const inFlight = new Map<string, Promise<void>>()

// Small queue so a far-zoom sweep over a fresh chamber does not decode
// hundreds of full images at once.
const MAX_CONCURRENT_GENERATIONS = 2
let activeGenerations = 0
const generationQueue: (() => void)[] = []

function acquireGenerationSlot(): Promise<void> {
  if (activeGenerations < MAX_CONCURRENT_GENERATIONS) {
    activeGenerations += 1
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    generationQueue.push(() => {
      activeGenerations += 1
      resolve()
    })
  })
}

function releaseGenerationSlot(): void {
  activeGenerations -= 1
  generationQueue.shift()?.()
}

export async function generateImageThumbnail(src: string): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image for thumbnail: ${src}`))
    img.src = pathToUrl(src)
  })
  const { width, height } = thumbnailDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

export function ensureThumbnail(src: string | undefined, generate: ThumbnailGenerator = generateImageThumbnail): Promise<void> {
  if (!isLocalAssetSrc(src)) return Promise.resolve()
  const existing = getAssetMetadata(src)
  if (existing && existing.thumbnailPath !== undefined) return Promise.resolve()
  const pending = inFlight.get(src)
  if (pending) return pending

  const task = (async () => {
    const lookup = await getIpc().invoke('assets:getThumbnail', { path: src }) as ThumbnailLookup
    if (!lookup.exists) {
      recordAssetMetadata({ src, exists: false, thumbnailPath: null })
      return
    }
    if (lookup.thumbnailPath) {
      recordAssetMetadata({ src, exists: true, size: lookup.size, mtimeMs: lookup.mtimeMs, thumbnailPath: lookup.thumbnailPath })
      return
    }
    await acquireGenerationSlot()
    try {
      const imageData = await generate(src)
      const cached = await getIpc().invoke('assets:cacheThumbnail', { path: src, imageData }) as { thumbnailPath?: unknown }
      recordAssetMetadata({
        src,
        exists: true,
        size: lookup.size,
        mtimeMs: lookup.mtimeMs,
        thumbnailPath: typeof cached.thumbnailPath === 'string' ? cached.thumbnailPath : null,
      })
    } catch (error) {
      console.error('Thumbnail generation failed:', error)
      recordAssetMetadata({ src, exists: true, size: lookup.size, mtimeMs: lookup.mtimeMs, thumbnailPath: null })
    } finally {
      releaseGenerationSlot()
    }
  })().finally(() => { inFlight.delete(src) })

  inFlight.set(src, task)
  return task
}
