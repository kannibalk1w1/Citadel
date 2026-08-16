import type { CanvasItem, Viewport } from '../../types'
import { canvasColors } from '../theme/canvasColors'

/**
 * Video, YouTube, audio and 3D items are DOM-layer overlays, so the Konva stage
 * capture never sees them and they left blank gaps in exports — the same hole
 * code cards had.
 *
 * None of them can be captured honestly. A `<video>` is a live element with
 * controls, a YouTube item is an Electron `<webview>` the renderer cannot read,
 * a 3D item is a Three renderer loop, and the audio waveform is an AnalyserNode
 * reading playback in real time — flat and meaningless when nothing is playing.
 * So the export draws a still: the poster or preview frame the preview pipeline
 * already cached where one exists, and otherwise a neutral placeholder carrying
 * enough identity that the gap is never silent.
 */

export const DOM_MEDIA_TYPES = ['video', 'youtube', 'audio', 'model3d'] as const
export type DomMediaType = typeof DOM_MEDIA_TYPES[number]

const BADGES: Record<DomMediaType, string> = {
  video: 'VIDEO',
  youtube: 'YOUTUBE',
  audio: 'AUDIO',
  model3d: '3D MODEL',
}

/** Types whose preview pipeline produces a still we can legitimately draw. */
const POSTER_TYPES = new Set<DomMediaType>(['video', 'model3d'])

export type DomMediaExportPlan = {
  type: DomMediaType
  badge: string
  identity: string
  /** Cached still to draw, when the preview pipeline has produced one. */
  posterPath: string | null
  x: number
  y: number
  width: number
  height: number
  opacity: number
}

export function isExportableDomMedia(item: CanvasItem): boolean {
  return (DOM_MEDIA_TYPES as readonly string[]).includes(item.type) && item.visible !== false
}

/** The last path segment, for either separator. */
export function basename(src: string): string {
  const parts = src.split(/[\\/]/)
  return parts[parts.length - 1] || src
}

export function youTubeVideoId(src: string): string | null {
  const short = /youtu\.be\/([\w-]{6,})/.exec(src)
  if (short) return short[1]
  const long = /[?&]v=([\w-]{6,})/.exec(src)
  if (long) return long[1]
  const embed = /\/embed\/([\w-]{6,})/.exec(src)
  return embed ? embed[1] : null
}

/**
 * What the placeholder says the item is. Enough to identify the thing that used
 * to be a blank rectangle, without pretending to be its content.
 */
export function mediaIdentity(item: CanvasItem): string {
  if (!item.src) return 'Source missing'
  if (item.type === 'youtube') {
    const id = youTubeVideoId(item.src)
    return id ? `youtube.com · ${id}` : item.src
  }
  return basename(item.src)
}

export function domMediaExportPlan(
  item: CanvasItem,
  viewport: Viewport,
  pixelRatio = 1,
  thumbnailFor: (src: string | undefined) => string | null = () => null,
): DomMediaExportPlan | null {
  if (!isExportableDomMedia(item)) return null
  const type = item.type as DomMediaType
  const unit = viewport.scale * pixelRatio
  const width = item.width * unit
  const height = item.height * unit
  if (width <= 0 || height <= 0) return null

  return {
    type,
    badge: BADGES[type],
    identity: mediaIdentity(item),
    posterPath: POSTER_TYPES.has(type) ? thumbnailFor(item.src) : null,
    x: item.x * unit + viewport.x * pixelRatio,
    y: item.y * unit + viewport.y * pixelRatio,
    width,
    height,
    opacity: item.opacity ?? 1,
  }
}

/** Letterboxes a source into a destination, preserving aspect ratio. */
export function containRect(
  srcW: number,
  srcH: number,
  dst: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  if (srcW <= 0 || srcH <= 0) return dst
  const scale = Math.min(dst.width / srcW, dst.height / srcH)
  const width = srcW * scale
  const height = srcH * scale
  return {
    x: dst.x + (dst.width - width) / 2,
    y: dst.y + (dst.height - height) / 2,
    width,
    height,
  }
}

/** Trims to fit a pixel budget at the given monospace-ish size. */
export function fitLabel(text: string, maxWidth: number, fontPx: number): string {
  const perChar = fontPx * 0.6
  if (perChar <= 0 || maxWidth <= 0) return ''
  const max = Math.floor(maxWidth / perChar)
  if (text.length <= max) return text
  if (max <= 1) return ''
  // Keep the tail: a filename's distinguishing part is usually at the end.
  return `…${text.slice(-(max - 1))}`
}

type PosterImage = CanvasImageSource & { width: number; height: number }

export function paintDomMediaCard(
  ctx: CanvasRenderingContext2D,
  plan: DomMediaExportPlan,
  poster: PosterImage | null,
): void {
  const colors = canvasColors()
  const { x, y, width, height } = plan

  ctx.save()
  ctx.globalAlpha = plan.opacity
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  ctx.fillStyle = colors.bgSunken
  ctx.fillRect(x, y, width, height)

  if (poster && poster.width > 0 && poster.height > 0) {
    const fitted = containRect(poster.width, poster.height, plan)
    ctx.drawImage(poster, fitted.x, fitted.y, fitted.width, fitted.height)
  }

  // A poster is a frame of the media, not the media: the badge stays so a still
  // video is never mistaken for a plain image in an exported board.
  const badgeFont = Math.max(1, Math.min(height * 0.16, width * 0.1, 13 * (width / 240)))
  const identityFont = badgeFont * 0.8
  const pad = Math.max(2, badgeFont * 0.6)

  if (!poster) {
    ctx.strokeStyle = colors.border
    ctx.lineWidth = Math.max(1, badgeFont / 12)
    ctx.setLineDash([badgeFont * 0.5, badgeFont * 0.4])
    ctx.strokeRect(x + pad, y + pad, Math.max(0, width - pad * 2), Math.max(0, height - pad * 2))
    ctx.setLineDash([])

    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `${badgeFont}px ${LABEL_STACK}`
    ctx.fillStyle = colors.textSecondary
    ctx.fillText(plan.badge, x + width / 2, y + height / 2, Math.max(0, width - pad * 2))

    ctx.font = `${identityFont}px ${LABEL_STACK}`
    ctx.fillStyle = colors.textMuted
    ctx.fillText(
      fitLabel(plan.identity, width - pad * 2, identityFont),
      x + width / 2,
      y + height / 2 + badgeFont * 1.4,
      Math.max(0, width - pad * 2),
    )
  } else {
    // Corner badge over the frame, on a scrim so it stays legible on any still.
    ctx.font = `${badgeFont}px ${LABEL_STACK}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const badgeWidth = plan.badge.length * badgeFont * 0.62 + pad * 2
    ctx.globalAlpha = plan.opacity * 0.72
    ctx.fillStyle = colors.bgSunken
    ctx.fillRect(x + pad, y + pad, badgeWidth, badgeFont + pad)
    ctx.globalAlpha = plan.opacity
    ctx.fillStyle = colors.textSecondary
    ctx.fillText(plan.badge, x + pad * 2, y + pad * 1.5)
  }

  ctx.restore()
}

const LABEL_STACK = "'Inter', ui-sans-serif, system-ui, sans-serif"

/**
 * Paints every DOM-media item. `posterFor` hands back an already-decoded image
 * for a plan's `posterPath`; loading is the caller's job so this stays testable
 * and so the export can decode all posters in one pass.
 */
export function paintDomMediaForExport(
  ctx: CanvasRenderingContext2D,
  items: CanvasItem[],
  viewport: Viewport,
  pixelRatio = 1,
  options: {
    thumbnailFor?: (src: string | undefined) => string | null
    posterFor?: (path: string) => PosterImage | null
  } = {},
): number {
  let painted = 0
  for (const item of items) {
    const plan = domMediaExportPlan(item, viewport, pixelRatio, options.thumbnailFor)
    if (!plan) continue
    const poster = plan.posterPath ? options.posterFor?.(plan.posterPath) ?? null : null
    paintDomMediaCard(ctx, plan, poster)
    painted += 1
  }
  return painted
}

/** Poster paths the given items would draw, for the caller to preload. */
export function posterPathsForExport(
  items: CanvasItem[],
  thumbnailFor: (src: string | undefined) => string | null,
): string[] {
  const paths = new Set<string>()
  for (const item of items) {
    if (!isExportableDomMedia(item)) continue
    if (!POSTER_TYPES.has(item.type as DomMediaType)) continue
    const path = thumbnailFor(item.src)
    if (path) paths.add(path)
  }
  return [...paths]
}
