import type { CanvasBoard, CanvasItem } from '../../types'
import type { CacheStats } from '../../main/previewCache'
import { canvasRuntimeStats, type CanvasRuntimeStats } from './canvasRuntimeStats'
import { measureMediaPreviewLoad } from './largeBoardFixture'

export type MediaPreviewProfilePaths = {
  gifPath: string
  videoPath: string
  modelPath: string
}

export type MediaPreviewProfileResult = {
  startedAt: number
  finishedAt: number
  durationMs: number
  assetPaths: MediaPreviewProfilePaths
  cacheBefore: CacheStats
  cacheAfterCold: CacheStats
  cacheAfterWarm: CacheStats
  cacheDeltaCold: CacheStats
  cacheDeltaWarm: CacheStats
  chamberLoad: CanvasRuntimeStats
  mediaPreviewLoad: ReturnType<typeof measureMediaPreviewLoad>
  timedOut: boolean
  notes: string[]
}

type LocationLike = {
  search?: string
  hash?: string
}

type SummarizeOptions = {
  board: CanvasBoard
  assetPaths: MediaPreviewProfilePaths
  startedAt: number
  finishedAt: number
  cacheBefore: CacheStats
  cacheAfterCold: CacheStats
  cacheAfterWarm: CacheStats
  previewedItemIds: string[]
  timedOut: boolean
}

const PROFILE_BOARD_ID = 'media-preview-profile-board'
const PROFILE_SCREEN = { width: 960, height: 640 }
const PROFILE_OVERSCAN_PX = 240

function item(id: string, type: CanvasItem['type'], src: string, x: number): CanvasItem {
  return {
    id,
    type,
    x,
    y: 80,
    width: type === 'video' ? 220 : 180,
    height: type === 'video' ? 124 : 180,
    rotation: 0,
    zIndex: x,
    locked: false,
    visible: true,
    opacity: 1,
    tags: ['media-preview-profile'],
    src,
    meta: { profile: 'media-preview' },
  }
}

function diffStats(after: CacheStats, before: CacheStats): CacheStats {
  return {
    count: after.count - before.count,
    bytes: after.bytes - before.bytes,
  }
}

export function isMediaPreviewProfileEnabled(location: LocationLike, isDev: boolean): boolean {
  if (!isDev) return false
  const search = new URLSearchParams(location.search ?? '')
  return search.get('profile') === 'media-preview' || (location.hash ?? '').includes('profile-media-preview')
}

export function createMediaPreviewProfileBoard(paths: MediaPreviewProfilePaths): CanvasBoard {
  return {
    id: PROFILE_BOARD_ID,
    name: 'Media Preview Profile',
    viewport: { x: 0, y: 0, scale: 0.5 },
    connections: [],
    items: [
      item('media-preview-profile-gif', 'gif', paths.gifPath, 80),
      item('media-preview-profile-video', 'video', paths.videoPath, 320),
      item('media-preview-profile-model', 'model3d', paths.modelPath, 600),
    ],
    meta: { profile: 'media-preview' },
  }
}

export function summarizeMediaPreviewProfile(options: SummarizeOptions): MediaPreviewProfileResult {
  const notes = options.timedOut
    ? ['Timed out before all three media previews appeared in cache.']
    : []

  return {
    startedAt: options.startedAt,
    finishedAt: options.finishedAt,
    durationMs: options.finishedAt - options.startedAt,
    assetPaths: options.assetPaths,
    cacheBefore: options.cacheBefore,
    cacheAfterCold: options.cacheAfterCold,
    cacheAfterWarm: options.cacheAfterWarm,
    cacheDeltaCold: diffStats(options.cacheAfterCold, options.cacheBefore),
    cacheDeltaWarm: diffStats(options.cacheAfterWarm, options.cacheAfterCold),
    chamberLoad: canvasRuntimeStats(options.board.items, options.board.items),
    mediaPreviewLoad: measureMediaPreviewLoad(options.board.items, {
      viewport: options.board.viewport,
      screen: PROFILE_SCREEN,
      overscanPx: PROFILE_OVERSCAN_PX,
      cachedPreviewIds: options.previewedItemIds,
    }),
    timedOut: options.timedOut,
    notes,
  }
}
