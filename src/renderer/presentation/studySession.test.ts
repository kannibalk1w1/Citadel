import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../types'
import {
  DEFAULT_STUDY_SECONDS,
  STUDY_INTERVALS,
  buildStudyQueue,
  formatStudyClock,
  isStudyFinalStretch,
  isStudyableItem,
  nextStudyIndex,
  previousStudyIndex,
  shuffleWithSeed,
  studyElapsedFraction,
  studyEmptyReason,
  studyProgressLabel,
} from './studySession'

function item(patch: Partial<CanvasItem> & Pick<CanvasItem, 'id' | 'type'>): CanvasItem {
  return {
    x: 0, y: 0, width: 100, height: 100,
    rotation: 0, zIndex: 0, locked: false, visible: true, opacity: 1, tags: [],
    ...patch,
  }
}

const board: CanvasItem[] = [
  item({ id: 'a', type: 'image', y: 0 }),
  item({ id: 'note', type: 'sticky', y: 10 }),
  item({ id: 'b', type: 'image', y: 100 }),
  item({ id: 'swatch', type: 'swatch', y: 150 }),
  item({ id: 'c', type: 'gif', y: 200 }),
  item({ id: 'hidden', type: 'image', y: 300, visible: false }),
]

describe('what a session studies', () => {
  it('takes the things you can draw from, and nothing else', () => {
    expect(isStudyableItem(item({ id: 'x', type: 'image' }))).toBe(true)
    expect(isStudyableItem(item({ id: 'x', type: 'gif' }))).toBe(true)
    expect(isStudyableItem(item({ id: 'x', type: 'video' }))).toBe(true)
    expect(isStudyableItem(item({ id: 'x', type: 'model3d' }))).toBe(true)
    // A queue of sticky notes and colour swatches is nobody's practice session.
    expect(isStudyableItem(item({ id: 'x', type: 'sticky' }))).toBe(false)
    expect(isStudyableItem(item({ id: 'x', type: 'swatch' }))).toBe(false)
    expect(isStudyableItem(item({ id: 'x', type: 'text' }))).toBe(false)
    expect(isStudyableItem(item({ id: 'x', type: 'image', visible: false }))).toBe(false)
  })

  it('builds a board queue in presentation order', () => {
    expect(buildStudyQueue(board, { source: 'board', shuffle: false })).toEqual(['a', 'b', 'c'])
  })

  it('builds a selection queue from what is selected', () => {
    const queue = buildStudyQueue(board, { source: 'selection', shuffle: false, selectedIds: ['c', 'a', 'note'] })
    expect(queue).toEqual(['a', 'c'])
  })

  it('returns nothing when there is nothing to draw from', () => {
    expect(buildStudyQueue([], { source: 'board', shuffle: false })).toEqual([])
    expect(buildStudyQueue(board, { source: 'selection', shuffle: false, selectedIds: ['note'] })).toEqual([])
    expect(studyEmptyReason('selection')).toContain('Select')
    expect(studyEmptyReason('board')).toContain('board')
  })

  it('shuffles reproducibly for a given seed, and keeps every image', () => {
    const inOrder = buildStudyQueue(board, { source: 'board', shuffle: false })
    const shuffled = buildStudyQueue(board, { source: 'board', shuffle: true, seed: 12345 })

    expect([...shuffled].sort()).toEqual([...inOrder].sort())
    expect(buildStudyQueue(board, { source: 'board', shuffle: true, seed: 12345 })).toEqual(shuffled)
  })

  it('shuffles a longer list into a different order than it started', () => {
    const ids = Array.from({ length: 40 }, (_, i) => `item-${i}`)
    expect(shuffleWithSeed(ids, 7)).not.toEqual(ids)
    expect([...shuffleWithSeed(ids, 7)].sort()).toEqual([...ids].sort())
  })
})

describe('walking the queue', () => {
  it('runs to the end and stops', () => {
    expect(nextStudyIndex(0, 3, false)).toBe(1)
    expect(nextStudyIndex(2, 3, false)).toBeNull()
  })

  it('wraps both ways when looping', () => {
    expect(nextStudyIndex(2, 3, true)).toBe(0)
    expect(previousStudyIndex(0, 3, true)).toBe(2)
  })

  it('goes back, but not past the start', () => {
    expect(previousStudyIndex(1, 3, false)).toBe(0)
    expect(previousStudyIndex(0, 3, false)).toBeNull()
  })

  it('has nowhere to go in an empty queue', () => {
    expect(nextStudyIndex(0, 0, true)).toBeNull()
    expect(previousStudyIndex(0, 0, true)).toBeNull()
  })
})

describe('what the countdown shows', () => {
  it('reads as a clock', () => {
    expect(formatStudyClock(90_000)).toBe('1:30')
    expect(formatStudyClock(5_000)).toBe('0:05')
    expect(formatStudyClock(0)).toBe('0:00')
    expect(formatStudyClock(-500)).toBe('0:00')
  })

  it('drains the ring from empty to full', () => {
    expect(studyElapsedFraction(60_000, 60_000)).toBe(0)
    expect(studyElapsedFraction(30_000, 60_000)).toBe(0.5)
    expect(studyElapsedFraction(0, 60_000)).toBe(1)
    // A sleeping window can report a longer tick than the interval it measured.
    expect(studyElapsedFraction(-5_000, 60_000)).toBe(1)
    expect(studyElapsedFraction(1_000, 0)).toBe(1)
  })

  it('hurries the eye along in the last few seconds', () => {
    expect(isStudyFinalStretch(30_000)).toBe(false)
    expect(isStudyFinalStretch(4_000)).toBe(true)
    expect(isStudyFinalStretch(0)).toBe(false)
  })

  it('counts the images honestly', () => {
    expect(studyProgressLabel(0, 12)).toBe('1 of 12')
    expect(studyProgressLabel(11, 12)).toBe('12 of 12')
    // Finishing leaves the index past the end; it must not read "13 of 12".
    expect(studyProgressLabel(12, 12)).toBe('12 of 12')
    expect(studyProgressLabel(0, 0)).toBe('Nothing to study')
  })

  it('offers the gesture-drawing ladder, with a sane default on it', () => {
    expect(STUDY_INTERVALS.map((entry) => entry.seconds)).toEqual([30, 60, 120, 300, 600])
    expect(STUDY_INTERVALS.some((entry) => entry.seconds === DEFAULT_STUDY_SECONDS)).toBe(true)
  })
})
