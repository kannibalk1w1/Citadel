import { create } from 'zustand'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { inscribe } from '../ui/toasts/inscriptionToastStore'
import { focusViewportFor } from './presentationNavigation'
import {
  DEFAULT_STUDY_SECONDS,
  STUDY_TICK_MS,
  buildStudyQueue,
  nextStudyIndex,
  previousStudyIndex,
  studyEmptyReason,
  type StudySource,
  type StudyStatus,
} from './studySession'

/**
 * The clock behind a study session.
 *
 * Everything decidable lives in `studySession.ts` as plain functions; this holds
 * the running queue and the one interval driving it. Advancing a session only
 * selects an item and moves the viewport — no `CanvasEvent`, nothing saved, so
 * a practice session cannot dirty a project.
 */

type StudyState = {
  status: StudyStatus
  queue: string[]
  index: number
  intervalSeconds: number
  remainingMs: number
  source: StudySource
  shuffle: boolean
  loop: boolean

  setIntervalSeconds: (seconds: number) => void
  setSource: (source: StudySource) => void
  toggleShuffle: () => void
  toggleLoop: () => void

  start: () => boolean
  pause: () => void
  resume: () => void
  stop: () => void
  advance: (direction: 1 | -1) => void
  tick: (elapsedMs: number) => void
}

let timer: ReturnType<typeof setInterval> | null = null

function stopTimer(): void {
  if (timer !== null) clearInterval(timer)
  timer = null
}

function startTimer(): void {
  stopTimer()
  timer = setInterval(() => {
    useStudyStore.getState().tick(STUDY_TICK_MS)
  }, STUDY_TICK_MS)
}

/** Test seam: sessions run on a real interval otherwise. */
export function stopStudyTimerForTests(): void {
  stopTimer()
}

function showItem(id: string): void {
  const canvas = useCanvasStore.getState()
  const item = canvas.items().find((candidate) => candidate.id === id)
  if (!item) return
  canvas.setSelection([item.id])
  canvas.updateViewport(focusViewportFor(item, { width: window.innerWidth, height: window.innerHeight }))
}

export const useStudyStore = create<StudyState>((set, get) => ({
  status: 'idle',
  queue: [],
  index: 0,
  intervalSeconds: DEFAULT_STUDY_SECONDS,
  remainingMs: DEFAULT_STUDY_SECONDS * 1000,
  source: 'board',
  shuffle: true,
  loop: false,

  setIntervalSeconds: (seconds) => set((s) => ({
    intervalSeconds: seconds,
    // Changing the length mid-session restarts the current item's clock rather
    // than leaving a countdown that outlives its own interval.
    remainingMs: s.status === 'idle' || s.status === 'finished' ? seconds * 1000 : Math.min(s.remainingMs, seconds * 1000),
  })),
  setSource: (source) => set({ source }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleLoop: () => set((s) => ({ loop: !s.loop })),

  start: () => {
    const { source, shuffle, intervalSeconds } = get()
    const canvas = useCanvasStore.getState()
    const queue = buildStudyQueue(canvas.items(), {
      source,
      shuffle,
      seed: Date.now() % 2147483647,
      selectedIds: canvas.selectedIds,
    })

    if (queue.length === 0) {
      inscribe(studyEmptyReason(source), { tone: 'danger' })
      return false
    }

    const ui = useUIStore.getState()
    ui.setPresentationMode(true)
    ui.setToolMode('pan')
    ui.closeContextMenu()

    set({ status: 'running', queue, index: 0, remainingMs: intervalSeconds * 1000 })
    showItem(queue[0])
    startTimer()
    inscribe(`Study session: ${queue.length} ${queue.length === 1 ? 'image' : 'images'}`)
    return true
  },

  pause: () => {
    if (get().status !== 'running') return
    stopTimer()
    set({ status: 'paused' })
  },

  resume: () => {
    if (get().status !== 'paused') return
    set({ status: 'running' })
    startTimer()
  },

  stop: () => {
    stopTimer()
    set({ status: 'idle', queue: [], index: 0, remainingMs: get().intervalSeconds * 1000 })
    useUIStore.getState().setPresentationMode(false)
    useUIStore.getState().setToolMode('select')
  },

  advance: (direction) => {
    const { queue, index, loop, intervalSeconds, status } = get()
    if (status === 'idle') return

    const target = direction === 1
      ? nextStudyIndex(index, queue.length, loop)
      : previousStudyIndex(index, queue.length, loop)

    if (target === null) {
      stopTimer()
      set({ status: 'finished', remainingMs: 0 })
      inscribe(`Study session finished — ${queue.length} ${queue.length === 1 ? 'image' : 'images'}`)
      return
    }

    set({ index: target, remainingMs: intervalSeconds * 1000, status: status === 'finished' ? 'running' : status })
    if (status === 'finished') startTimer()
    showItem(queue[target])
  },

  tick: (elapsedMs) => {
    if (get().status !== 'running') return
    const remaining = get().remainingMs - elapsedMs
    if (remaining > 0) {
      set({ remainingMs: remaining })
      return
    }
    get().advance(1)
  },
}))
