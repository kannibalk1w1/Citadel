// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { useInscriptionToastStore } from '../ui/toasts/inscriptionToastStore'
import { stopStudyTimerForTests, useStudyStore } from './studyStore'
import { STUDY_TICK_MS } from './studySession'

function image(id: string, y: number): CanvasItem {
  return {
    id, type: 'image', x: 0, y, width: 200, height: 200,
    rotation: 0, zIndex: 0, locked: false, visible: true, opacity: 1, tags: [],
    src: `/refs/${id}.png`,
  }
}

const items = [image('a', 0), image('b', 300), image('c', 600)]

beforeEach(() => {
  vi.useFakeTimers()
  useCanvasStore.setState({
    boards: [{ id: 'board-1', name: 'Board', items, connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
  useHistoryStore.setState({ events: [], cursor: -1 })
  useInscriptionToastStore.setState({ toasts: [] })
  useUIStore.setState({ presentationMode: false })
  useStudyStore.setState({
    status: 'idle', queue: [], index: 0, intervalSeconds: 60,
    remainingMs: 60_000, source: 'board', shuffle: false, loop: false,
  })
})

afterEach(() => {
  stopStudyTimerForTests()
  vi.useRealTimers()
})

describe('starting a session', () => {
  it('builds a queue, shows the first image, and enters presentation mode', () => {
    expect(useStudyStore.getState().start()).toBe(true)

    const state = useStudyStore.getState()
    expect(state.status).toBe('running')
    expect(state.queue).toEqual(['a', 'b', 'c'])
    expect(state.index).toBe(0)
    expect(useCanvasStore.getState().selectedIds).toEqual(['a'])
    expect(useUIStore.getState().presentationMode).toBe(true)
  })

  it('refuses, with a reason, when there is nothing to study', () => {
    useCanvasStore.setState({
      boards: [{ id: 'board-1', name: 'Board', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } }],
    })

    expect(useStudyStore.getState().start()).toBe(false)
    expect(useStudyStore.getState().status).toBe('idle')
    expect(useUIStore.getState().presentationMode).toBe(false)
    const toast = useInscriptionToastStore.getState().toasts[0]
    expect(toast.tone).toBe('danger')
    expect(toast.text).toContain('no images to study')
  })

  it('never touches the project — practice is not an edit', () => {
    useStudyStore.getState().start()
    vi.advanceTimersByTime(60_000)
    useStudyStore.getState().advance(1)

    expect(useHistoryStore.getState().events).toEqual([])
    expect(useCanvasStore.getState().items()).toEqual(items)
  })
})

describe('the clock', () => {
  it('advances to the next image when the interval runs out', () => {
    useStudyStore.getState().start()

    vi.advanceTimersByTime(59_000)
    expect(useStudyStore.getState().index).toBe(0)
    expect(useStudyStore.getState().remainingMs).toBeLessThanOrEqual(1_000)

    vi.advanceTimersByTime(1_000 + STUDY_TICK_MS)
    expect(useStudyStore.getState().index).toBe(1)
    expect(useCanvasStore.getState().selectedIds).toEqual(['b'])
    // The next image gets a fresh interval, not the remainder of the last one.
    // Near-full rather than exactly full: a tick lands after the advance.
    expect(useStudyStore.getState().remainingMs).toBeGreaterThan(59_000)
  })

  it('stops at the end rather than looping by default', () => {
    useStudyStore.getState().start()
    vi.advanceTimersByTime(60_000 * 3 + STUDY_TICK_MS * 3)

    expect(useStudyStore.getState().status).toBe('finished')
    expect(useInscriptionToastStore.getState().toasts.some((t) => t.text.includes('finished'))).toBe(true)
  })

  it('wraps back to the first image when looping', () => {
    useStudyStore.setState({ loop: true })
    useStudyStore.getState().start()
    vi.advanceTimersByTime(60_000 * 3 + STUDY_TICK_MS * 3)

    expect(useStudyStore.getState().status).toBe('running')
    expect(useStudyStore.getState().index).toBe(0)
  })

  it('holds still while paused, and picks up where it left off', () => {
    useStudyStore.getState().start()
    vi.advanceTimersByTime(10_000)
    const atPause = useStudyStore.getState().remainingMs

    useStudyStore.getState().pause()
    vi.advanceTimersByTime(60_000)
    expect(useStudyStore.getState().status).toBe('paused')
    expect(useStudyStore.getState().remainingMs).toBe(atPause)
    expect(useStudyStore.getState().index).toBe(0)

    useStudyStore.getState().resume()
    vi.advanceTimersByTime(1_000)
    expect(useStudyStore.getState().remainingMs).toBeLessThan(atPause)
  })
})

describe('driving a session by hand', () => {
  it('skips forward and back, resetting the clock each time', () => {
    useStudyStore.getState().start()
    vi.advanceTimersByTime(30_000)

    useStudyStore.getState().advance(1)
    expect(useStudyStore.getState().index).toBe(1)
    expect(useStudyStore.getState().remainingMs).toBe(60_000)
    expect(useCanvasStore.getState().selectedIds).toEqual(['b'])

    useStudyStore.getState().advance(-1)
    expect(useStudyStore.getState().index).toBe(0)
    expect(useCanvasStore.getState().selectedIds).toEqual(['a'])
  })

  it('leaves presentation mode and forgets the queue when stopped', () => {
    useStudyStore.getState().start()
    useStudyStore.getState().stop()

    expect(useStudyStore.getState().status).toBe('idle')
    expect(useStudyStore.getState().queue).toEqual([])
    expect(useUIStore.getState().presentationMode).toBe(false)
  })

  it('does nothing when told to advance with no session running', () => {
    expect(() => useStudyStore.getState().advance(1)).not.toThrow()
    expect(useStudyStore.getState().status).toBe('idle')
  })

  it('studies only the selection when asked to', () => {
    useCanvasStore.setState({ selectedIds: ['c', 'a'] })
    useStudyStore.setState({ source: 'selection' })

    useStudyStore.getState().start()
    expect(useStudyStore.getState().queue).toEqual(['a', 'c'])
  })
})
