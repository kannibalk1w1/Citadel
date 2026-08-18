import { nanoid } from 'nanoid'
import type { CanvasBoard, CanvasItem, Connection } from '../../types'

export type SourceCaptureReference = {
  reference: string
  locator?: string
  sourceItemId?: string
  region?: ImageRegion
}

/** A source-image crop in fractions of its width and height. */
export type ImageRegion = { x: number; y: number; width: number; height: number }

export function imageRegionFromPercent(input: string): ImageRegion | undefined {
  if (!input.trim()) return undefined
  const values = input.split(',').map((part) => Number(part.trim()))
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return undefined
  const [x, y, width, height] = values
  if (width <= 0 || height <= 0) return undefined
  const left = Math.max(0, Math.min(100, x)) / 100
  const top = Math.max(0, Math.min(100, y)) / 100
  return {
    x: left,
    y: top,
    width: Math.max(0, Math.min(1 - left, width / 100)),
    height: Math.max(0, Math.min(1 - top, height / 100)),
  }
}

export function imageRegionPercent(region: ImageRegion): string {
  return [region.x, region.y, region.width, region.height].map((value) => `${Math.round(value * 100)}%`).join(', ')
}

/** Updates only a capture's normalized image region, ready for one history event. */
export function sourceCaptureRegionPatch(item: CanvasItem, region: ImageRegion): {
  before: { id: string; meta: Record<string, unknown> }
  after: { id: string; meta: Record<string, unknown> }
} | null {
  const source = sourceCaptureReference(item)
  if (!source?.sourceItemId) return null
  const x = Math.max(0, Math.min(1, region.x))
  const y = Math.max(0, Math.min(1, region.y))
  const width = Math.max(0.01, Math.min(1 - x, region.width))
  const height = Math.max(0.01, Math.min(1 - y, region.height))
  return {
    before: { id: item.id, meta: item.meta ?? {} },
    after: {
      id: item.id,
      meta: { ...item.meta, source: { ...source, region: { x, y, width, height } } },
    },
  }
}

export function sourceCaptureReference(item: CanvasItem): SourceCaptureReference | undefined {
  if (item.meta?.kind !== 'source-capture') return undefined
  const value = item.meta.source
  if (!value || typeof value !== 'object') return undefined
  const source = value as Record<string, unknown>
  if (typeof source.reference !== 'string') return undefined
  return {
    reference: source.reference,
    locator: typeof source.locator === 'string' ? source.locator : undefined,
    sourceItemId: typeof source.sourceItemId === 'string' ? source.sourceItemId : undefined,
    region: validRegion(source.region),
  }
}

/** Capture notes linked directly to a source item, newest first. */
export function sourceCapturesForItem(items: CanvasItem[], sourceItemId: string): CanvasItem[] {
  return items
    .filter((item) => sourceCaptureReference(item)?.sourceItemId === sourceItemId)
    .sort((a, b) => captureTimestamp(b) - captureTimestamp(a))
}

/** The note text a capture carries, trimmed. Empty when it was never written. */
export function sourceCaptureContent(item: CanvasItem): string {
  return typeof item.meta?.content === 'string' ? item.meta.content.trim() : ''
}

/** The one line that stands for a capture in a list. */
export function sourceCaptureTitle(item: CanvasItem): string {
  return sourceCaptureContent(item).split(/\r?\n/, 1)[0] || 'Untitled capture'
}

/**
 * Matches a capture on its own words: the note text and the location it was
 * taken from (page/section/time), plus the source reference so a filter like
 * `example.com` still finds the captures taken off that page. Terms are
 * matched independently and all must hit, so "orange figure" finds a note
 * about orange filed under Figure 2.
 */
export function sourceCaptureMatches(item: CanvasItem, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const source = sourceCaptureReference(item)
  const haystack = [sourceCaptureContent(item), source?.locator ?? '', source?.reference ?? '']
    .join('\n')
    .toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

/** A filter box is noise on a short list; it earns its place once scanning does not. */
export const CAPTURE_FILTER_THRESHOLD = 6
/** How many rows a list draws before it collapses into a count. */
export const CAPTURE_LIST_CAP = 12

export type SourceCaptureListModel = {
  /** Every capture on this source, newest first, before filtering. */
  total: number
  /** What the filter left, before the row cap. */
  matched: number
  /** The rows to draw. */
  rows: CanvasItem[]
  /** Matches beyond the row cap, reported rather than drawn. */
  hidden: number
  /** Whether the filter box is worth showing at all. */
  showFilter: boolean
  /** Whether rows should drop to their compact form. */
  compact: boolean
}

/**
 * The list an image's Captures section draws. Filtering and the large-list
 * treatment live here rather than in the panel so both are testable without a
 * DOM, and so the thresholds are stated once.
 */
export function sourceCaptureListModel(
  captures: CanvasItem[],
  query = '',
  { cap = CAPTURE_LIST_CAP, filterThreshold = CAPTURE_FILTER_THRESHOLD } = {},
): SourceCaptureListModel {
  const matched = query.trim() ? captures.filter((capture) => sourceCaptureMatches(capture, query.trim())) : captures
  return {
    total: captures.length,
    matched: matched.length,
    rows: matched.slice(0, cap),
    hidden: Math.max(0, matched.length - cap),
    showFilter: captures.length >= filterThreshold,
    compact: captures.length >= filterThreshold,
  }
}

/**
 * Whether a capture still reaches the item it was taken from.
 *
 * `unlinked` is a capture written without a source item — a legitimate state,
 * not a fault. `broken` means the link was made and the item it named is gone
 * from every chamber, which is the case worth reporting.
 */
export type SourceCaptureHealth =
  | { state: 'unlinked' }
  | { state: 'linked'; source: CanvasItem; boardId: string; boardName: string; sameBoard: boolean }
  | { state: 'broken'; sourceItemId: string }

export function sourceCaptureHealth(
  capture: CanvasItem,
  boards: CanvasBoard[],
  activeBoardId: string | null,
): SourceCaptureHealth {
  const sourceItemId = sourceCaptureReference(capture)?.sourceItemId
  if (!sourceItemId) return { state: 'unlinked' }
  for (const board of boards) {
    const source = board.items.find((item) => item.id === sourceItemId)
    if (source) {
      return { state: 'linked', source, boardId: board.id, boardName: board.name, sameBoard: board.id === activeBoardId }
    }
  }
  return { state: 'broken', sourceItemId }
}

/** Every capture in the archive whose source item no longer exists. */
export function brokenSourceCaptures(boards: CanvasBoard[]): { capture: CanvasItem; boardId: string }[] {
  const known = new Set(boards.flatMap((board) => board.items.map((item) => item.id)))
  return boards.flatMap((board) =>
    board.items
      .filter((item) => {
        const id = sourceCaptureReference(item)?.sourceItemId
        return typeof id === 'string' && !known.has(id)
      })
      .map((capture) => ({ capture, boardId: board.id })),
  )
}

/**
 * Points a capture at a different source item, or at nothing.
 *
 * Only `sourceItemId` moves: the note, the reference, the location and the
 * region are carried across untouched, because a broken link is a bookkeeping
 * fault and must not cost the user what they actually wrote. The region stays
 * because it is stored in fractions of the image, so it survives a source of a
 * different size — it may need correcting on the new image, which the existing
 * region editor already does.
 */
export function sourceCaptureReattachPatch(item: CanvasItem, sourceItemId: string | null): {
  before: { id: string; meta: Record<string, unknown> }
  after: { id: string; meta: Record<string, unknown> }
} | null {
  const source = sourceCaptureReference(item)
  if (!source) return null
  if ((source.sourceItemId ?? null) === sourceItemId) return null
  const next: SourceCaptureReference = { ...source }
  if (sourceItemId) next.sourceItemId = sourceItemId
  else delete next.sourceItemId
  return {
    before: { id: item.id, meta: item.meta ?? {} },
    after: { id: item.id, meta: { ...item.meta, source: next } },
  }
}

function captureTimestamp(item: CanvasItem): number {
  const capturedAt = item.meta?.capturedAt
  return typeof capturedAt === 'number' && Number.isFinite(capturedAt) ? capturedAt : item.zIndex
}

function validRegion(value: unknown): ImageRegion | undefined {
  if (!value || typeof value !== 'object') return undefined
  const region = value as Record<string, unknown>
  if (!['x', 'y', 'width', 'height'].every((key) => typeof region[key] === 'number' && Number.isFinite(region[key]))) return undefined
  if ((region.width as number) <= 0 || (region.height as number) <= 0) return undefined
  return { x: region.x as number, y: region.y as number, width: region.width as number, height: region.height as number }
}

export function createSourceCapture(
  content: string,
  reference: SourceCaptureReference,
  placement: { x: number; y: number },
  id = nanoid(),
): CanvasItem {
  return {
    id,
    type: 'sticky',
    x: placement.x,
    y: placement.y,
    width: 280,
    height: 180,
    rotation: 0,
    zIndex: Date.now(),
    locked: false,
    visible: true,
    opacity: 1,
    tags: ['capture'],
    meta: {
      kind: 'source-capture',
      content,
      source: reference,
      capturedAt: Date.now(),
      color: '#1e1b18',
    },
  }
}

export function sourceCaptureConnection(captureId: string, sourceItemId: string, color: string, id = nanoid()): Connection {
  return {
    id,
    fromId: captureId,
    toId: sourceItemId,
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
