import { describe, expect, it, beforeEach } from 'vitest'
import type { CanvasEvent, CanvasItem } from '../../types'
import { useCanvasStore } from './canvasStore'
import { useHistoryStore } from './historyStore'
import { groupItemsWithHistory, reorderItemsWithHistory, ungroupItemsWithHistory } from './itemEditHistory'
import { revertEvent, replayEvent } from './canvasEventApply'
import { travelHistoryTo } from './historyTravel'

const BOARD = 'board-1'

function item(id: string, zIndex: number, groupId?: string): CanvasItem {
  return {
    id, type: 'sticky', x: 0, y: 0, width: 100, height: 100,
    rotation: 0, zIndex, locked: false, visible: true, opacity: 1, tags: [], groupId,
  }
}

beforeEach(() => {
  useCanvasStore.setState({
    boards: [{ id: BOARD, name: 'Board', items: [item('a', 0), item('b', 1), item('c', 2, 'group-1')], connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
    activeBoardId: BOARD,
    selectedIds: [],
  })
  useHistoryStore.getState().resetHistory()
})

describe('item edit history', () => {
  it('records reorder edits as one undoable style event', () => {
    reorderItemsWithHistory(BOARD, ['a'], 'front')

    const event = useHistoryStore.getState().events.at(-1)!
    expect(event.type).toBe('ITEM_STYLE')
    expect(useHistoryStore.getState().isDirty()).toBe(true)
    revertEvent(event)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'a')?.zIndex).toBe(0)
    replayEvent(event)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'a')?.zIndex).toBe(3)
  })

  it('captures the neighbor swapped by a forward or backward move', () => {
    reorderItemsWithHistory(BOARD, ['b'], 'backward')

    const event = useHistoryStore.getState().events.at(-1)!
    expect((event.before as Array<{ id: string; zIndex: number }>).map((patch) => patch.id)).toEqual(['a', 'b'])
    revertEvent(event)
    expect(useCanvasStore.getState().boards[0].items.map((item) => item.zIndex)).toEqual([0, 1, 2])
  })

  it('preserves group membership when replaying an ordinary style patch', () => {
    reorderItemsWithHistory(BOARD, ['c'], 'front')

    const event = useHistoryStore.getState().events.at(-1)!
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'c')?.groupId).toBe('group-1')
    revertEvent(event)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'c')?.groupId).toBe('group-1')
    replayEvent(event)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'c')?.groupId).toBe('group-1')
  })

  it('records group and ungroup edits with all affected item patches', () => {
    groupItemsWithHistory(BOARD, ['a', 'b'])
    const groupEvent = useHistoryStore.getState().events.at(-1)!
    expect(groupEvent.type).toBe('ITEM_STYLE')
    const groupId = useCanvasStore.getState().boards[0].items.find((item) => item.id === 'a')?.groupId
    expect(groupId).toBeTruthy()
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'b')?.groupId).toBe(groupId)

    const groupRoundTrip = JSON.parse(JSON.stringify(groupEvent)) as CanvasEvent
    revertEvent(groupEvent)
    replayEvent(groupRoundTrip)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'a')?.groupId).toBe(groupId)

    travelHistoryTo(-1)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'a')?.groupId).toBeUndefined()
    travelHistoryTo(0)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'b')?.groupId).toBe(groupId)

    ungroupItemsWithHistory(BOARD, [groupId!])
    const ungroupEvent = useHistoryStore.getState().events.at(-1)!
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'a')?.groupId).toBeUndefined()
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'b')?.groupId).toBeUndefined()
    revertEvent(ungroupEvent)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'a')?.groupId).toBe(groupId)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'b')?.groupId).toBe(groupId)

    const ungroupRoundTrip = JSON.parse(JSON.stringify(ungroupEvent)) as CanvasEvent
    replayEvent(ungroupRoundTrip)
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'a')?.groupId).toBeUndefined()
    expect(useCanvasStore.getState().boards[0].items.find((item) => item.id === 'b')?.groupId).toBeUndefined()
  })
})
