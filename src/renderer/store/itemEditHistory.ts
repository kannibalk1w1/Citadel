import type { CanvasItem } from '../../types'
import { useCanvasStore } from './canvasStore'
import { useHistoryStore } from './historyStore'

type ItemStylePatch = { id: string; groupId?: CanvasItem['groupId'] | null } & Omit<Partial<CanvasItem>, 'groupId'>

function activeBoardItems(boardId: string): CanvasItem[] {
  return useCanvasStore.getState().boards.find((board) => board.id === boardId)?.items ?? []
}

function pushChangedStyle(boardId: string, before: ItemStylePatch[], after: ItemStylePatch[]): void {
  if (before.length !== after.length) return
  if (before.every((patch, index) => JSON.stringify(patch) === JSON.stringify(after[index]))) return
  useHistoryStore.getState().push('ITEM_STYLE', boardId, before, after)
}

export function reorderItemsWithHistory(
  boardId: string,
  ids: string[],
  direction: 'front' | 'back' | 'forward' | 'backward',
): void {
  const canvas = useCanvasStore.getState()
  const beforeItems = activeBoardItems(boardId)
  const selected = beforeItems.filter((item) => ids.includes(item.id) && !item.locked)
  selected.forEach((item) => canvas.reorderItem(boardId, item.id, direction))
  const afterItems = activeBoardItems(boardId)
  const afterById = new Map(afterItems.map((item) => [item.id, item]))
  const changed = beforeItems.filter((item) => afterById.get(item.id)?.zIndex !== item.zIndex)
  const before = changed.map((item) => ({ id: item.id, zIndex: item.zIndex }))
  const after = changed.map((item) => ({ id: item.id, zIndex: afterById.get(item.id)!.zIndex }))
  pushChangedStyle(boardId, before, after)
}

export function groupItemsWithHistory(boardId: string, ids: string[]): void {
  const canvas = useCanvasStore.getState()
  const selected = activeBoardItems(boardId).filter((item) => ids.includes(item.id) && !item.locked)
  const before = selected.map((item) => ({ id: item.id, groupId: item.groupId ?? null }))
  canvas.groupItems(boardId, selected.map((item) => item.id))
  const current = activeBoardItems(boardId)
  const currentById = new Map(current.map((item) => [item.id, item]))
  const after = selected.map((item) => ({ id: item.id, groupId: currentById.get(item.id)?.groupId ?? null }))
  pushChangedStyle(boardId, before, after)
}

export function ungroupItemsWithHistory(boardId: string, groupIds: string[]): void {
  const canvas = useCanvasStore.getState()
  const groups = new Set(groupIds)
  const selected = activeBoardItems(boardId).filter((item) => item.groupId && groups.has(item.groupId))
  const before = selected.map((item) => ({ id: item.id, groupId: item.groupId }))
  groupIds.forEach((groupId) => canvas.ungroupItems(boardId, groupId))
  const currentById = new Map(activeBoardItems(boardId).map((item) => [item.id, item]))
  const after = selected.map((item) => ({ id: item.id, groupId: currentById.get(item.id)?.groupId ?? null }))
  pushChangedStyle(boardId, before, after)
}
