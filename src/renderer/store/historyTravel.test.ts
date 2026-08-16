// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from './canvasStore'
import { useHistoryStore } from './historyStore'
import { replayEvent, revertEvent } from './canvasEventApply'
import { historyBounds, travelHistoryTo } from './historyTravel'

/**
 * The claim this feature rests on: scrubbing to a point leaves the board
 * exactly where pressing Ctrl+Z that many times would have. It holds because
 * travelling *is* repeated undo, but that only stays true if nothing grows a
 * second way of applying events, so it is asserted rather than assumed.
 */

function item(id: string, x: number): CanvasItem {
  return {
    id, type: 'image', x, y: 0, width: 100, height: 100,
    rotation: 0, zIndex: 0, locked: false, visible: true, opacity: 1, tags: [],
    src: `/refs/${id}.png`,
  }
}

const BOARD = 'board-1'

function freshBoard(): void {
  useCanvasStore.setState({
    boards: [{ id: BOARD, name: 'Board', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
    activeBoardId: BOARD,
    selectedIds: [],
  })
  useHistoryStore.setState({ events: [], cursor: -1, savedCursor: -1, markers: [] })
}

/** Three edits, each logged the way feature code logs them. */
function buildSession(): void {
  const canvas = useCanvasStore.getState()
  const history = useHistoryStore.getState()

  const first = item('a', 0)
  canvas.addItem(BOARD, first)
  history.push('ITEM_ADD', BOARD, null, first)

  const second = item('b', 200)
  canvas.addItem(BOARD, second)
  history.push('ITEM_ADD', BOARD, null, second)

  canvas.moveItems(BOARD, [{ id: 'a', x: 500, y: 50 }])
  history.push('ITEM_MOVE', BOARD, [{ id: 'a', x: 0, y: 0 }], [{ id: 'a', x: 500, y: 50 }])
}

beforeEach(() => {
  freshBoard()
  buildSession()
})

describe('travelling through a board history', () => {
  it('knows how far back it can go', () => {
    expect(historyBounds()).toEqual({ min: -1, max: 2 })
  })

  it('takes the board back to the start of the session', () => {
    travelHistoryTo(-1)

    expect(useCanvasStore.getState().items()).toEqual([])
    expect(useHistoryStore.getState().cursor).toBe(-1)
  })

  it('takes it back to a point in the middle, and forward again', () => {
    travelHistoryTo(0)
    expect(useCanvasStore.getState().items().map((i) => i.id)).toEqual(['a'])
    expect(useCanvasStore.getState().items()[0].x).toBe(0)

    travelHistoryTo(2)
    expect(useCanvasStore.getState().items().map((i) => i.id)).toEqual(['a', 'b'])
    expect(useCanvasStore.getState().items().find((i) => i.id === 'a')?.x).toBe(500)
  })

  it('lands exactly where the same number of undos would', () => {
    const scrubbed = (() => {
      travelHistoryTo(0)
      return JSON.stringify(useCanvasStore.getState().items())
    })()

    // Rebuild and walk back by hand, the way the keyboard does.
    freshBoard()
    buildSession()
    for (let i = 0; i < 2; i += 1) {
      const event = useHistoryStore.getState().undo()
      if (event) revertEvent(event)
    }
    const undone = JSON.stringify(useCanvasStore.getState().items())

    expect(scrubbed).toBe(undone)
  })

  it('replays forward to the same board it left', () => {
    const atNow = JSON.stringify(useCanvasStore.getState().items())

    travelHistoryTo(-1)
    travelHistoryTo(2)

    expect(JSON.stringify(useCanvasStore.getState().items())).toBe(atNow)
  })

  it('stops at the ends rather than running off them', () => {
    expect(travelHistoryTo(999)).toBe(2)
    expect(travelHistoryTo(-999)).toBe(-1)
    expect(useCanvasStore.getState().items()).toEqual([])
  })

  it('does nothing when asked to travel where it already is', () => {
    const before = JSON.stringify(useCanvasStore.getState().items())
    expect(travelHistoryTo(2)).toBe(2)
    expect(JSON.stringify(useCanvasStore.getState().items())).toBe(before)
  })

  it('leaves the log itself untouched — travelling is not editing', () => {
    const events = useHistoryStore.getState().events
    travelHistoryTo(-1)
    travelHistoryTo(1)
    expect(useHistoryStore.getState().events).toBe(events)
  })
})

describe('markers', () => {
  it('names the moment the cursor is on, and finds it again', () => {
    travelHistoryTo(0)
    const marker = useHistoryStore.getState().addMarker('after the first image')
    expect(marker).not.toBeNull()

    travelHistoryTo(2)
    expect(useCanvasStore.getState().items()).toHaveLength(2)

    const events = useHistoryStore.getState().events
    const target = events.findIndex((event) => event.id === marker!.eventId)
    travelHistoryTo(target)
    expect(useCanvasStore.getState().items().map((i) => i.id)).toEqual(['a'])
  })

  it('refuses to mark the same moment twice', () => {
    expect(useHistoryStore.getState().addMarker('one')).not.toBeNull()
    expect(useHistoryStore.getState().addMarker('again')).toBeNull()
  })

  it('forgets markers when the history is reset', () => {
    useHistoryStore.getState().addMarker('somewhere')
    useHistoryStore.getState().resetHistory()
    expect(useHistoryStore.getState().markers).toEqual([])
  })
})

describe('a change made after scrubbing back', () => {
  it('drops the future, exactly as undo then editing does', () => {
    travelHistoryTo(0)

    const canvas = useCanvasStore.getState()
    const fresh = item('c', 900)
    canvas.addItem(BOARD, fresh)
    useHistoryStore.getState().push('ITEM_ADD', BOARD, null, fresh)

    const { events, cursor } = useHistoryStore.getState()
    expect(events).toHaveLength(2)
    expect(cursor).toBe(1)
    expect(useCanvasStore.getState().items().map((i) => i.id)).toEqual(['a', 'c'])

    // And the replay path still agrees with the log it was left with.
    travelHistoryTo(-1)
    expect(useCanvasStore.getState().items()).toEqual([])
    travelHistoryTo(1)
    expect(useCanvasStore.getState().items().map((i) => i.id)).toEqual(['a', 'c'])
  })
})

describe('applying one event', () => {
  it('reverts and replays an add', () => {
    const event = useHistoryStore.getState().events[1]
    revertEvent(event)
    expect(useCanvasStore.getState().items().map((i) => i.id)).toEqual(['a'])
    replayEvent(event)
    expect(useCanvasStore.getState().items().map((i) => i.id)).toEqual(['a', 'b'])
  })
})
