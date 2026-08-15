import type { CanvasBoard, CanvasItem, Connection } from '../../types'
import type { ScreenSize, VisibleItemOptions } from '../canvas/visibility/viewportVisibility'
import type { CanvasRuntimeStats } from './canvasRuntimeStats'
import type { Viewport } from '../../types'
import { visibleItemIds } from '../canvas/visibility/viewportVisibility'
import { visibleConnectionIds } from '../canvas/overlays/overlayVisibility'
import { getSearchResults } from '../ui/itemSearchModel'
import { canvasRuntimeStats } from './canvasRuntimeStats'
import { preferThumbnail } from '../assets/previewPolicy'

const DEFAULT_ITEM_COUNT = 1000
const DEFAULT_COLUMNS = 40
const DEFAULT_MATCH_EVERY = 5
const DEFAULT_QUERY = 'tag:index-probe'
const DEFAULT_MARK_LIMIT = 24

type LargeBoardFixtureOptions = {
  itemCount?: number
  columns?: number
  matchEvery?: number
  query?: string
}

type LargeBoardFixture = {
  board: CanvasBoard
  query: string
  expectedMatchCount: number
  expectedMarkCount: number
}

type SearchMeasurementOptions = {
  markLimit?: number
  now?: () => number
  visibleItemIds?: ReadonlySet<string>
}

type SearchMeasurement = {
  durationMs: number
  resultCount: number
  markCount: number
  firstResultIds: string[]
}

type ChamberLoadMeasurementOptions = VisibleItemOptions & {
  viewport: Viewport
  screen: ScreenSize
}

type BindingOverlayMeasurementOptions = ChamberLoadMeasurementOptions & {
  activeConnectionId?: string | null
  pulsingConnectionId?: string | null
}

type BindingOverlayMeasurement = {
  renderedConnections: number
  activeOrPulsingConnections: number
  endpointSigilMarks: number
}

type MediaPreviewMeasurementOptions = ChamberLoadMeasurementOptions & {
  cachedPreviewIds?: string[]
  selectedIds?: string[]
}

type MediaPreviewMeasurement = {
  previewableMountedRelics: number
  staticPreviewRelics: number
  awakePreviewableRelics: number
  pendingPreviewRelics: number
}

const HEAVY_PREVIEWABLE_TYPES = new Set<CanvasItem['type']>(['gif', 'video', 'model3d'])

function paddedIndex(index: number): string {
  return index.toString().padStart(4, '0')
}

function createFixtureItem(index: number, columns: number, matchEvery: number): CanvasItem {
  const matched = index % matchEvery === 0
  const col = index % columns
  const row = Math.floor(index / columns)
  return {
    id: `fixture-relic-${paddedIndex(index)}`,
    type: matched ? 'image' : 'sticky',
    x: col * 180,
    y: row * 140,
    width: matched ? 144 : 132,
    height: matched ? 96 : 88,
    rotation: 0,
    zIndex: index,
    locked: false,
    visible: true,
    opacity: 1,
    tags: matched ? ['index-probe', 'memory'] : ['archive'],
    src: matched ? `C:/citadel-fixture/relic-${paddedIndex(index)}.png` : undefined,
    meta: matched ? { content: `Index probe memory ${paddedIndex(index)}` } : { content: `Archive note ${paddedIndex(index)}` },
  }
}

export function createLargeBoardFixture(options: LargeBoardFixtureOptions = {}): LargeBoardFixture {
  const itemCount = options.itemCount ?? DEFAULT_ITEM_COUNT
  const columns = options.columns ?? DEFAULT_COLUMNS
  const matchEvery = Math.max(1, options.matchEvery ?? DEFAULT_MATCH_EVERY)
  const query = options.query ?? DEFAULT_QUERY
  const items = Array.from({ length: itemCount }, (_, index) => createFixtureItem(index, columns, matchEvery))
  const expectedMatchCount = items.filter((_, index) => index % matchEvery === 0).length

  return {
    board: {
      id: 'fixture-large-board',
      name: 'Large Fixture Chamber',
      items,
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
      meta: { mood: 'gothic', fixture: 'large-board' },
    },
    query,
    expectedMatchCount,
    expectedMarkCount: Math.min(expectedMatchCount, DEFAULT_MARK_LIMIT),
  }
}

export function measureLivingIndexSearch(
  items: CanvasItem[],
  query: string,
  options: SearchMeasurementOptions = {},
): SearchMeasurement {
  const markLimit = options.markLimit ?? DEFAULT_MARK_LIMIT
  const now = options.now ?? (() => performance.now())
  const start = now()
  const results = getSearchResults(items, query, items.length)
  const end = now()
  const markableResults = options.visibleItemIds
    ? results.filter((result) => options.visibleItemIds?.has(result.id))
    : results

  return {
    durationMs: end - start,
    resultCount: results.length,
    markCount: Math.min(markableResults.length, markLimit),
    firstResultIds: results.slice(0, 5).map((result) => result.id),
  }
}

export function measureChamberLoad(
  items: CanvasItem[],
  options: ChamberLoadMeasurementOptions,
): CanvasRuntimeStats {
  const visibleIds = new Set(visibleItemIds(items, options.viewport, options.screen, {
    overscanPx: options.overscanPx,
    alwaysIncludeIds: options.alwaysIncludeIds,
  }))
  return canvasRuntimeStats(items, items.filter((item) => visibleIds.has(item.id)))
}

export function measureBindingOverlayLoad(
  items: CanvasItem[],
  connections: Connection[],
  options: BindingOverlayMeasurementOptions,
): BindingOverlayMeasurement {
  const visibleIds = new Set(visibleItemIds(items, options.viewport, options.screen, {
    overscanPx: options.overscanPx,
    alwaysIncludeIds: options.alwaysIncludeIds,
  }))
  const renderedConnectionIds = visibleConnectionIds(connections, visibleIds, {
    activeConnectionId: options.activeConnectionId,
    pulsingConnectionId: options.pulsingConnectionId,
  })
  const activeOrPulsing = new Set([
    options.activeConnectionId,
    options.pulsingConnectionId,
  ].filter((id): id is string => typeof id === 'string' && renderedConnectionIds.has(id)))

  return {
    renderedConnections: renderedConnectionIds.size,
    activeOrPulsingConnections: activeOrPulsing.size,
    endpointSigilMarks: activeOrPulsing.size * 2,
  }
}

export function measureMediaPreviewLoad(
  items: CanvasItem[],
  options: MediaPreviewMeasurementOptions,
): MediaPreviewMeasurement {
  const visibleIds = new Set(visibleItemIds(items, options.viewport, options.screen, {
    overscanPx: options.overscanPx,
    alwaysIncludeIds: options.alwaysIncludeIds,
  }))
  const cached = new Set(options.cachedPreviewIds ?? [])
  const selected = new Set(options.selectedIds ?? [])
  const mountedPreviewable = items.filter((item) => visibleIds.has(item.id) && HEAVY_PREVIEWABLE_TYPES.has(item.type))

  let staticPreviewRelics = 0
  let awakePreviewableRelics = 0
  let pendingPreviewRelics = 0

  for (const item of mountedPreviewable) {
    const wantsStaticPreview = preferThumbnail(
      item.width * options.viewport.scale,
      item.height * options.viewport.scale,
      selected.has(item.id),
    )

    if (!wantsStaticPreview) {
      awakePreviewableRelics += 1
      continue
    }

    if (cached.has(item.id)) {
      staticPreviewRelics += 1
    } else {
      pendingPreviewRelics += 1
    }
  }

  return {
    previewableMountedRelics: mountedPreviewable.length,
    staticPreviewRelics,
    awakePreviewableRelics,
    pendingPreviewRelics,
  }
}
