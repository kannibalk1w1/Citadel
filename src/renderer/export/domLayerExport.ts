import type { CanvasItem, Viewport } from '../../types'
import { getAssetMetadata } from '../assets/assetMetadata'
import { pathToUrl } from '../utils/pathToUrl'
import { isExportableCodeItem, paintCodeCardsForExport } from './codeCardExport'
import { isExportableDomMedia, paintDomMediaForExport, posterPathsForExport } from './domMediaExport'

/**
 * The single composition pass over DOM-layer items. Everything the Konva stage
 * capture cannot see is repainted here: code cards keep their terminal still,
 * and video/YouTube/audio/3D get a poster or a labelled placeholder.
 */

export type PosterImage = CanvasImageSource & { width: number; height: number }
export type PosterLoader = (path: string) => Promise<PosterImage | null>

/** True when the board holds anything the stage capture would have missed. */
export function hasDOMLayerItems(items: CanvasItem[]): boolean {
  return items.some((item) => isExportableCodeItem(item) || isExportableDomMedia(item))
}

/** Cached preview still for a source, or null when the pipeline has none. */
export function cachedThumbnailFor(src: string | undefined): string | null {
  return getAssetMetadata(src)?.thumbnailPath ?? null
}

/**
 * Decodes a cached preview off the local protocol. A poster that fails to load
 * resolves to null so the item falls back to its placeholder — a broken cache
 * entry must not take the whole export down.
 */
export const loadPosterImage: PosterLoader = (path) => new Promise((resolve) => {
  if (typeof Image !== 'function') return resolve(null)
  const image = new Image()
  image.onload = () => resolve(image as unknown as PosterImage)
  image.onerror = () => resolve(null)
  image.src = pathToUrl(path)
})

export async function loadPosters(paths: string[], load: PosterLoader): Promise<Map<string, PosterImage>> {
  const posters = new Map<string, PosterImage>()
  const loaded = await Promise.all(paths.map(async (path) => [path, await load(path)] as const))
  for (const [path, image] of loaded) {
    if (image) posters.set(path, image)
  }
  return posters
}

export async function paintDOMLayerForExport(
  ctx: CanvasRenderingContext2D,
  items: CanvasItem[],
  viewport: Viewport,
  pixelRatio = 1,
  deps: {
    thumbnailFor?: (src: string | undefined) => string | null
    loadPoster?: PosterLoader
  } = {},
): Promise<{ codeCards: number; media: number }> {
  const thumbnailFor = deps.thumbnailFor ?? cachedThumbnailFor
  const loadPoster = deps.loadPoster ?? loadPosterImage

  const posters = await loadPosters(posterPathsForExport(items, thumbnailFor), loadPoster)

  const codeCards = paintCodeCardsForExport(ctx, items.filter(isExportableCodeItem), viewport, pixelRatio)
  const media = paintDomMediaForExport(ctx, items.filter(isExportableDomMedia), viewport, pixelRatio, {
    thumbnailFor,
    posterFor: (path) => posters.get(path) ?? null,
  })

  return { codeCards, media }
}
