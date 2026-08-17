import type { CanvasEvent, CanvasEventType } from '../../types'

/**
 * Reading a board's own history back.
 *
 * `historyStore` already keeps every change as a timestamped `CanvasEvent`,
 * because undo and recording were deliberately built as one log. That means the
 * whole session is sitting in memory and the only way through it was one Ctrl+Z
 * at a time. This turns the same list into something you can scrub.
 *
 * Everything here is pure: a cursor position is just an index into the log, and
 * travelling is repeated undo or redo, so the time machine cannot drift away
 * from what undo would have done.
 */

/** Cursor -1 means "before the first event" — the board as the session found it. */
export const HISTORY_START = -1

const EVENT_LABELS: Record<CanvasEventType, string> = {
  ITEM_ADD: 'Added',
  ITEM_DELETE: 'Deleted',
  ITEM_MOVE: 'Moved',
  ITEM_RESIZE: 'Resized',
  ITEM_STYLE: 'Restyled',
  CONNECTION_ADD: 'Connected',
  CONNECTION_DELETE: 'Disconnected',
  CONNECTION_STYLE: 'Restyled connection',
  VIEWPORT_CHANGE: 'Moved the view',
  BOARD_ADD: 'Added a board',
  BOARD_DELETE: 'Deleted a board',
  BOARD_RENAME: 'Renamed a board',
  BOARD_STYLE: 'Restyled the board',
  SELECTION_CHANGE: 'Changed the selection',
  COMPARE_MERGE: 'Merged a comparison',
}

/** What the event acted on, or '' when the payload says nothing useful. */
function describeSubject(event: CanvasEvent): string {
  const payload = (event.after ?? event.before) as unknown
  if (Array.isArray(payload)) {
    return payload.length === 1 ? '1 item' : `${payload.length} items`
  }
  if (payload && typeof payload === 'object') {
    const type = (payload as { type?: unknown }).type
    if (typeof type === 'string') return type
  }
  return ''
}

export function describeEvent(event: CanvasEvent): string {
  const label = EVENT_LABELS[event.type] ?? event.type
  const subject = describeSubject(event)
  return subject ? `${label} ${subject}` : label
}

/** How far into the session an event happened, relative to the first one. */
export function elapsedLabel(event: CanvasEvent, firstTimestamp: number): string {
  const seconds = Math.max(0, Math.round((event.timestamp - firstTimestamp) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

export function historyPositionLabel(cursor: number, total: number): string {
  if (total === 0) return 'Nothing recorded yet'
  if (cursor === HISTORY_START) return `Start · 0 of ${total}`
  return `${cursor + 1} of ${total}`
}

/**
 * The steps needed to get from one cursor to another. Positive means replay,
 * negative means revert; the caller walks them one at a time through the same
 * undo/redo the keyboard uses.
 */
export function travelPlan(from: number, to: number, total: number): { direction: 1 | -1; steps: number } {
  const target = clampCursor(to, total)
  const start = clampCursor(from, total)
  const delta = target - start
  return { direction: delta >= 0 ? 1 : -1, steps: Math.abs(delta) }
}

export function clampCursor(cursor: number, total: number): number {
  return Math.min(total - 1, Math.max(HISTORY_START, Math.round(cursor)))
}

/**
 * A named moment, keyed by the event it sits after rather than by position.
 * Positions shift whenever a new edit truncates the redo stack; an event id
 * does not, so a marker stays attached to the moment it was dropped on.
 */
export type HistoryMarker = {
  id: string
  eventId: string | null   // null marks the start of the session
  name: string
}

/**
 * Where an event-keyed thing sits on the scrubber. Markers and save snapshots
 * are both anchored this way, so they share one lookup.
 */
export function cursorForEvent(eventId: string | null, events: CanvasEvent[]): number {
  if (eventId === null) return HISTORY_START
  const index = events.findIndex((event) => event.id === eventId)
  return index === -1 ? HISTORY_START : index
}

export function markerCursor(marker: HistoryMarker, events: CanvasEvent[]): number {
  return cursorForEvent(marker.eventId, events)
}

/** Markers whose event is still in the log, in the order they occur. */
export function liveMarkers(markers: HistoryMarker[], events: CanvasEvent[]): HistoryMarker[] {
  const known = new Set(events.map((event) => event.id))
  return markers
    .filter((marker) => marker.eventId === null || known.has(marker.eventId))
    .sort((a, b) => markerCursor(a, events) - markerCursor(b, events))
}

export function defaultMarkerName(cursor: number, events: CanvasEvent[]): string {
  if (cursor === HISTORY_START || events.length === 0) return 'Session start'
  const event = events[Math.min(cursor, events.length - 1)]
  return describeEvent(event)
}
