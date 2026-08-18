import { describe, expect, it } from 'vitest'
import type { CanvasEvent } from '../../types'
import {
  SNAPSHOT_MAX,
  addBoardSnapshot,
  liveBoardSnapshots,
  snapshotCursor,
  snapshotLabel,
  snapshotsForBoard,
  type BoardSnapshot,
} from './boardSnapshots'
import { HISTORY_START } from './timeMachineModel'

const event = (id: string): CanvasEvent => ({
  id,
  timestamp: 0,
  boardId: 'board-1',
  type: 'ITEM_ADD',
  before: null,
  after: null,
})

const frame = (over: Partial<BoardSnapshot> = {}): BoardSnapshot => ({
  id: `snap-${Math.random()}`,
  eventId: null,
  boardId: 'board-1',
  dataUrl: 'data:image/jpeg;base64,x',
  width: 320,
  height: 200,
  takenAt: 1,
  ...over,
})

describe('the snapshot cap', () => {
  /**
   * The eviction tests below build a list of SNAPSHOT_MAX and expect
   * SNAPSHOT_MAX back, which passes for any value the constant takes — raising
   * it to 100,000 keeps them green while the memory budget it exists for is
   * gone. Frames are base64 images held for the session, so the number itself
   * is the behaviour.
   */
  it('is a number small enough to hold in memory', () => {
    expect(SNAPSHOT_MAX).toBeGreaterThanOrEqual(4)
    expect(SNAPSHOT_MAX).toBeLessThanOrEqual(64)
  })
})

describe('addBoardSnapshot', () => {
  it('keeps one frame per moment when the same state is saved twice', () => {
    const first = frame({ id: 'a', eventId: 'e1', takenAt: 1 })
    const second = frame({ id: 'b', eventId: 'e1', takenAt: 2 })

    const result = addBoardSnapshot([first], second)

    expect(result.map((snapshot) => snapshot.id)).toEqual(['b'])
  })

  it('treats the same event on a different board as a different moment', () => {
    const onBoardOne = frame({ id: 'a', eventId: 'e1', boardId: 'board-1' })
    const onBoardTwo = frame({ id: 'b', eventId: 'e1', boardId: 'board-2' })

    expect(addBoardSnapshot([onBoardOne], onBoardTwo)).toHaveLength(2)
  })

  it('drops the oldest frame once the cap is reached', () => {
    const full = Array.from({ length: SNAPSHOT_MAX }, (_, i) => frame({ id: `s${i}`, eventId: `e${i}` }))

    const result = addBoardSnapshot(full, frame({ id: 'newest', eventId: 'newest-event' }))

    expect(result).toHaveLength(SNAPSHOT_MAX)
    expect(result[0].id).toBe('s1')
    expect(result.at(-1)?.id).toBe('newest')
  })

  it('never grows past the cap even from an over-full list', () => {
    const over = Array.from({ length: SNAPSHOT_MAX + 5 }, (_, i) => frame({ id: `s${i}`, eventId: `e${i}` }))

    expect(addBoardSnapshot(over, frame({ eventId: 'extra' }))).toHaveLength(SNAPSHOT_MAX)
  })
})

describe('liveBoardSnapshots', () => {
  const events = [event('e1'), event('e2'), event('e3')]

  it('orders frames by where they sit on the scrubber, not when they were taken', () => {
    const later = frame({ id: 'later', eventId: 'e3', takenAt: 1 })
    const earlier = frame({ id: 'earlier', eventId: 'e1', takenAt: 2 })

    expect(liveBoardSnapshots([later, earlier], events).map((s) => s.id)).toEqual(['earlier', 'later'])
  })

  it('drops frames whose event a later edit truncated away', () => {
    const orphan = frame({ id: 'orphan', eventId: 'gone' })
    const kept = frame({ id: 'kept', eventId: 'e2' })

    expect(liveBoardSnapshots([orphan, kept], events).map((s) => s.id)).toEqual(['kept'])
  })

  it('keeps a session-start frame, which has no event to lose', () => {
    const start = frame({ id: 'start', eventId: null })

    expect(liveBoardSnapshots([start], events).map((s) => s.id)).toEqual(['start'])
    expect(snapshotCursor(start, events)).toBe(HISTORY_START)
  })
})

describe('snapshotsForBoard', () => {
  it('returns only the active board, and nothing when there is no board', () => {
    const frames = [frame({ id: 'a', boardId: 'board-1' }), frame({ id: 'b', boardId: 'board-2' })]

    expect(snapshotsForBoard(frames, 'board-2').map((s) => s.id)).toEqual(['b'])
    expect(snapshotsForBoard(frames, null)).toEqual([])
  })
})

describe('snapshotLabel', () => {
  it('marks a frame taken before any event as the session start', () => {
    expect(snapshotLabel(frame({ eventId: null }), [event('e1')])).toContain('session start')
    expect(snapshotLabel(frame({ eventId: 'e1' }), [event('e1')])).not.toContain('session start')
  })
})
