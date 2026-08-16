import { describe, expect, it } from 'vitest'
import type { CanvasEvent } from '../../types'
import {
  HISTORY_START,
  clampCursor,
  defaultMarkerName,
  describeEvent,
  elapsedLabel,
  historyPositionLabel,
  liveMarkers,
  markerCursor,
  travelPlan,
  type HistoryMarker,
} from './timeMachineModel'

function event(patch: Partial<CanvasEvent> & Pick<CanvasEvent, 'id' | 'type'>): CanvasEvent {
  return { timestamp: 0, boardId: 'board-1', before: null, after: null, ...patch }
}

describe('describing what happened', () => {
  it('names the change and what it touched', () => {
    expect(describeEvent(event({ id: '1', type: 'ITEM_ADD', after: { type: 'image' } }))).toBe('Added image')
    expect(describeEvent(event({ id: '2', type: 'ITEM_DELETE', before: [{ id: 'a' }, { id: 'b' }] }))).toBe('Deleted 2 items')
    expect(describeEvent(event({ id: '3', type: 'ITEM_MOVE', after: [{ id: 'a' }] }))).toBe('Moved 1 item')
    // Nothing useful in the payload leaves the label to speak for itself,
    // rather than "Restyled the board the board".
    expect(describeEvent(event({ id: '4', type: 'BOARD_STYLE' }))).toBe('Restyled the board')
  })

  it('says how far into the session a change happened', () => {
    expect(elapsedLabel(event({ id: '1', type: 'ITEM_ADD', timestamp: 5_000 }), 0)).toBe('5s')
    expect(elapsedLabel(event({ id: '2', type: 'ITEM_ADD', timestamp: 95_000 }), 0)).toBe('1m 35s')
    expect(elapsedLabel(event({ id: '3', type: 'ITEM_ADD', timestamp: 3_725_000 }), 0)).toBe('1h 02m')
    // A clock that went backwards must not produce a negative age.
    expect(elapsedLabel(event({ id: '4', type: 'ITEM_ADD', timestamp: 0 }), 5_000)).toBe('0s')
  })

  it('counts the position from the session start', () => {
    expect(historyPositionLabel(HISTORY_START, 4)).toBe('Start · 0 of 4')
    expect(historyPositionLabel(0, 4)).toBe('1 of 4')
    expect(historyPositionLabel(3, 4)).toBe('4 of 4')
    expect(historyPositionLabel(0, 0)).toBe('Nothing recorded yet')
  })
})

describe('travelling', () => {
  it('plans the direction and distance between two points', () => {
    expect(travelPlan(3, 0, 5)).toEqual({ direction: -1, steps: 3 })
    expect(travelPlan(0, 4, 5)).toEqual({ direction: 1, steps: 4 })
    expect(travelPlan(2, 2, 5)).toEqual({ direction: 1, steps: 0 })
  })

  it('never plans a trip past either end of the log', () => {
    expect(travelPlan(0, 99, 5).steps).toBe(4)
    expect(travelPlan(4, -99, 5)).toEqual({ direction: -1, steps: 5 })
    expect(clampCursor(99, 5)).toBe(4)
    expect(clampCursor(-99, 5)).toBe(HISTORY_START)
    expect(clampCursor(1.7, 5)).toBe(2)
  })
})

describe('markers', () => {
  const events = [
    event({ id: 'e1', type: 'ITEM_ADD' }),
    event({ id: 'e2', type: 'ITEM_MOVE' }),
    event({ id: 'e3', type: 'ITEM_DELETE' }),
  ]

  it('finds the position of the event a marker was dropped on', () => {
    expect(markerCursor({ id: 'm', eventId: 'e2', name: 'x' }, events)).toBe(1)
    expect(markerCursor({ id: 'm', eventId: null, name: 'start' }, events)).toBe(HISTORY_START)
  })

  it('keeps its place when earlier positions shift', () => {
    const marker: HistoryMarker = { id: 'm', eventId: 'e3', name: 'before the cull' }
    expect(markerCursor(marker, events)).toBe(2)

    // An edit after scrubbing back truncates the log; the marker's event is now
    // at a different index, and the marker follows it rather than the number.
    const rewritten = [event({ id: 'e0', type: 'ITEM_ADD' }), ...events]
    expect(markerCursor(marker, rewritten)).toBe(3)
  })

  it('drops markers whose event is no longer in the log', () => {
    const markers: HistoryMarker[] = [
      { id: 'm1', eventId: 'e2', name: 'kept' },
      { id: 'm2', eventId: 'gone', name: 'orphan' },
      { id: 'm3', eventId: null, name: 'start' },
    ]
    expect(liveMarkers(markers, events).map((m) => m.name)).toEqual(['start', 'kept'])
  })

  it('suggests a name from the moment being marked', () => {
    expect(defaultMarkerName(HISTORY_START, events)).toBe('Session start')
    expect(defaultMarkerName(1, events)).toBe('Moved')
    expect(defaultMarkerName(0, [])).toBe('Session start')
  })
})
