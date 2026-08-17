import type { CanvasEvent } from '../../types'
import { HISTORY_START, cursorForEvent } from './timeMachineModel'

/**
 * A picture of the board at the moment of a manual save.
 *
 * The time machine could already scrub the event log, but every position looked
 * the same until you travelled to it. Saving is the one moment a person has
 * already decided is worth keeping, so that is where a frame gets taken — the
 * scrubber ends up with a filmstrip of the states you chose to commit to.
 *
 * Anchored to an event id rather than a cursor position, for the same reason
 * markers are: editing after scrubbing back truncates the redo stack and every
 * later index shifts, but the event a snapshot was taken at either survives or
 * is gone.
 *
 * Everything here is pure. Taking the picture lives in export/exportCanvas.
 */
export type BoardSnapshot = {
  id: string
  eventId: string | null   // null marks the start of the session
  boardId: string
  dataUrl: string
  width: number
  height: number
  takenAt: number
}

/**
 * Frames are held in memory for the session, so this is a memory budget, not a
 * storage one. Sixteen thumbnails at the size captureBoardThumbnail produces is
 * well under a megabyte.
 */
export const SNAPSHOT_MAX = 16

/**
 * Saving twice without changing anything is one moment, not two, so a second
 * frame at the same event replaces the first rather than stacking up. When the
 * cap is reached the oldest frame goes, which keeps the most recent stretch of
 * work — the part still worth scrubbing.
 */
export function addBoardSnapshot(snapshots: BoardSnapshot[], next: BoardSnapshot): BoardSnapshot[] {
  const withoutSameMoment = snapshots.filter(
    (snapshot) => !(snapshot.eventId === next.eventId && snapshot.boardId === next.boardId),
  )
  const appended = [...withoutSameMoment, next]
  return appended.length <= SNAPSHOT_MAX ? appended : appended.slice(appended.length - SNAPSHOT_MAX)
}

/**
 * Frames whose event is still in the log, in the order they occur. A frame
 * taken on a branch that was later truncated has nothing to travel to, so it is
 * dropped rather than left pointing at the session start.
 */
export function liveBoardSnapshots(snapshots: BoardSnapshot[], events: CanvasEvent[]): BoardSnapshot[] {
  const known = new Set(events.map((event) => event.id))
  return snapshots
    .filter((snapshot) => snapshot.eventId === null || known.has(snapshot.eventId))
    .sort((a, b) => snapshotCursor(a, events) - snapshotCursor(b, events))
}

export function snapshotCursor(snapshot: BoardSnapshot, events: CanvasEvent[]): number {
  return cursorForEvent(snapshot.eventId, events)
}

/** Frames belonging to the board being looked at. */
export function snapshotsForBoard(snapshots: BoardSnapshot[], boardId: string | null): BoardSnapshot[] {
  return boardId ? snapshots.filter((snapshot) => snapshot.boardId === boardId) : []
}

export function snapshotLabel(snapshot: BoardSnapshot, events: CanvasEvent[]): string {
  const cursor = snapshotCursor(snapshot, events)
  const time = new Date(snapshot.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return cursor === HISTORY_START ? `Saved at ${time} · session start` : `Saved at ${time}`
}
