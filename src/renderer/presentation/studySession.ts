import type { CanvasItem } from '../../types'
import { orderedPresentationItems } from './presentationNavigation'

/**
 * Timed reference practice — gesture drawing, master studies, colour studies.
 *
 * A reference tool that only files pictures is a cupboard. This turns a board
 * into a session: pick what to study, pick how long each one gets, and draw
 * while Citadel moves through them. It is the reason to open the app on a day
 * when you are not collecting anything.
 *
 * The session owns nothing but a queue of item ids and a clock. Advancing means
 * selecting an item and moving the viewport, which is what presentation mode
 * already does, so a study session leaves no trace on the project and nothing
 * for undo to reverse.
 */

export type StudyStatus = 'idle' | 'running' | 'paused' | 'finished'

export type StudySource =
  /** Just what is selected — the usual way to study a handful of images. */
  | 'selection'
  /** Everything on the board, in presentation order. */
  | 'board'

export type StudyIntervalDef = { seconds: number; label: string }

/**
 * The classic gesture-drawing ladder. Short poses train decisiveness, long ones
 * train seeing; sessions usually walk up it.
 */
export const STUDY_INTERVALS: StudyIntervalDef[] = [
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '1m' },
  { seconds: 120, label: '2m' },
  { seconds: 300, label: '5m' },
  { seconds: 600, label: '10m' },
]

export const DEFAULT_STUDY_SECONDS = 60

/** How often the clock ticks. Fine enough for a smooth countdown, coarse enough to be cheap. */
export const STUDY_TICK_MS = 250

/**
 * Item types worth studying. A study queue full of sticky notes and colour
 * swatches would be nobody's practice session, so the queue is built from the
 * things you can actually draw from.
 */
const STUDYABLE_TYPES = new Set(['image', 'gif', 'video', 'model3d'])

export function isStudyableItem(item: CanvasItem): boolean {
  return STUDYABLE_TYPES.has(item.type) && item.visible !== false
}

/**
 * A deterministic shuffle, seeded so a test can assert the order and so
 * "reshuffle" is reproducible within a session. Fisher-Yates over a small
 * xorshift; nothing here needs cryptographic randomness.
 */
export function shuffleWithSeed<T>(list: T[], seed: number): T[] {
  const out = list.slice()
  let state = seed || 1
  for (let i = out.length - 1; i > 0; i -= 1) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    const j = Math.abs(state) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export type StudyQueueOptions = {
  source: StudySource
  shuffle: boolean
  seed?: number
  selectedIds?: string[]
}

/** The ids to walk through, in the order they will be shown. */
export function buildStudyQueue(items: CanvasItem[], options: StudyQueueOptions): string[] {
  const selected = new Set(options.selectedIds ?? [])
  const pool = options.source === 'selection'
    ? items.filter((item) => selected.has(item.id))
    : items

  const ordered = orderedPresentationItems(pool.filter(isStudyableItem))
  const ids = ordered.map((item) => item.id)
  return options.shuffle ? shuffleWithSeed(ids, options.seed ?? 1) : ids
}

/** The next position, or null when the session has reached the end. */
export function nextStudyIndex(index: number, total: number, loop: boolean): number | null {
  if (total === 0) return null
  const next = index + 1
  if (next < total) return next
  return loop ? 0 : null
}

export function previousStudyIndex(index: number, total: number, loop: boolean): number | null {
  if (total === 0) return null
  if (index > 0) return index - 1
  return loop ? total - 1 : null
}

export function formatStudyClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function studyProgressLabel(index: number, total: number): string {
  if (total === 0) return 'Nothing to study'
  return `${Math.min(index + 1, total)} of ${total}`
}

/**
 * The fraction of the current interval already spent, for the countdown ring.
 * Clamped, because a tab that was asleep can report a longer tick than the
 * interval it was measuring.
 */
export function studyElapsedFraction(remainingMs: number, intervalMs: number): number {
  if (intervalMs <= 0) return 1
  return Math.min(1, Math.max(0, 1 - remainingMs / intervalMs))
}

/** True when the countdown should hurry the eye along. */
export function isStudyFinalStretch(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= 5_000
}

export function studyEmptyReason(source: StudySource): string {
  return source === 'selection'
    ? 'Select some images to study first.'
    : 'This board has no images to study.'
}
