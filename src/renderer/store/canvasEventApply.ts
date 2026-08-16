import type { CanvasEvent, CanvasItem, Connection } from '../../types'
import { useCanvasStore } from './canvasStore'

/**
 * Applying one logged event forwards or backwards.
 *
 * `historyStore` keeps a timestamped `CanvasEvent[]` and undo, redo, recording
 * playback, and the time machine all move through the same list. This is the
 * one place that turns an entry into a change on the board, so those four can
 * never disagree about what an event means.
 *
 * `revert` applies an event's `before`; `replay` applies its `after`. Events
 * whose type is not handled here are positional only — the cursor moves past
 * them and the board is unchanged.
 */

type MovePatch = { id: string; x: number; y: number }

function applyMovePatch(boardId: string, patch: MovePatch | MovePatch[]): void {
  const moves = Array.isArray(patch) ? patch : [patch]
  useCanvasStore.getState().moveItems(boardId, moves)
}

/** Undo direction: put the board back the way this event found it. */
export function revertEvent(event: CanvasEvent): void {
  const canvas = useCanvasStore.getState()

  if (event.type === 'ITEM_ADD') {
    const item = event.after as { id: string }
    canvas.removeItems(event.boardId, [item.id])
  } else if (event.type === 'ITEM_DELETE') {
    const items = event.before as CanvasItem[]
    items.forEach((i) => canvas.addItem(event.boardId, i))
  } else if (event.type === 'ITEM_MOVE') {
    applyMovePatch(event.boardId, event.before as MovePatch | MovePatch[])
  } else if (event.type === 'ITEM_STYLE') {
    const patch = event.before as Partial<CanvasItem> & { id: string }
    canvas.updateItem(event.boardId, patch.id, patch)
  } else if (event.type === 'COMPARE_MERGE') {
    const { items: originals } = event.before as { items: CanvasItem[] }
    const merged = event.after as CanvasItem
    canvas.removeItems(event.boardId, [merged.id])
    originals.forEach((i) => canvas.addItem(event.boardId, i))
  } else if (event.type === 'BOARD_STYLE') {
    canvas.updateBoardMeta(event.boardId, event.before as Record<string, unknown>)
  } else if (event.type === 'CONNECTION_ADD') {
    const connection = event.after as Connection
    canvas.removeConnection(event.boardId, connection.id)
  }
}

/** Redo direction: do what this event recorded. */
export function replayEvent(event: CanvasEvent): void {
  const canvas = useCanvasStore.getState()

  if (event.type === 'ITEM_ADD') {
    canvas.addItem(event.boardId, event.after as CanvasItem)
  } else if (event.type === 'ITEM_DELETE') {
    const items = event.after as { id: string }[]
    canvas.removeItems(event.boardId, items.map((i) => i.id))
  } else if (event.type === 'ITEM_MOVE') {
    applyMovePatch(event.boardId, event.after as MovePatch | MovePatch[])
  } else if (event.type === 'ITEM_STYLE') {
    const patch = event.after as Partial<CanvasItem> & { id: string }
    canvas.updateItem(event.boardId, patch.id, patch)
  } else if (event.type === 'COMPARE_MERGE') {
    const { items: originals } = event.before as { items: CanvasItem[] }
    const merged = event.after as CanvasItem
    canvas.removeItems(event.boardId, originals.map((i) => i.id))
    canvas.addItem(event.boardId, merged)
  } else if (event.type === 'BOARD_STYLE') {
    canvas.updateBoardMeta(event.boardId, event.after as Record<string, unknown>)
  } else if (event.type === 'CONNECTION_ADD') {
    canvas.addConnection(event.boardId, event.after as Connection)
  }
}
