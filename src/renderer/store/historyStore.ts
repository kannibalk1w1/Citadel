import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { CanvasEvent, CanvasEventType, RecordingSession } from '../../types'

type HistoryState = {
  events: CanvasEvent[]
  cursor: number               // index of last applied event (-1 = nothing applied)
  recordingSession: RecordingSession | null
  isRecording: boolean

  // Undo / redo
  push: (type: CanvasEventType, boardId: string, before: unknown, after: unknown) => CanvasEvent
  undo: () => CanvasEvent | null
  redo: () => CanvasEvent | null
  canUndo: () => boolean
  canRedo: () => boolean

  // Recording
  startRecording: (name: string) => void
  stopRecording: () => RecordingSession | null

  // Recordings library
  recordings: RecordingSession[]
  saveRecording: (session: RecordingSession) => void
  deleteRecording: (id: string) => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  events: [],
  cursor: -1,
  recordingSession: null,
  isRecording: false,
  recordings: [],

  push: (type, boardId, before, after) => {
    const event: CanvasEvent = {
      id: nanoid(),
      timestamp: Date.now(),
      boardId,
      type,
      before,
      after,
    }
    set((s) => {
      // Truncate redo stack
      const events = [...s.events.slice(0, s.cursor + 1), event]
      const cursor = events.length - 1

      // Append to active recording
      const recordingSession = s.recordingSession
        ? { ...s.recordingSession, events: [...s.recordingSession.events, event] }
        : null

      return { events, cursor, recordingSession }
    })
    return event
  },

  undo: () => {
    const { cursor, events } = get()
    if (cursor < 0) return null
    const event = events[cursor]
    set({ cursor: cursor - 1 })
    return event
  },

  redo: () => {
    const { cursor, events } = get()
    if (cursor >= events.length - 1) return null
    const event = events[cursor + 1]
    set({ cursor: cursor + 1 })
    return event
  },

  canUndo: () => get().cursor >= 0,
  canRedo: () => get().cursor < get().events.length - 1,

  startRecording: (name) => {
    set({
      isRecording: true,
      recordingSession: { id: nanoid(), name, startedAt: Date.now(), events: [] },
    })
  },

  stopRecording: () => {
    const { recordingSession } = get()
    if (!recordingSession) return null
    set({ isRecording: false, recordingSession: null })
    return recordingSession
  },

  saveRecording: (session) => {
    set((s) => ({ recordings: [...s.recordings, session] }))
  },

  deleteRecording: (id) => {
    set((s) => ({ recordings: s.recordings.filter((r) => r.id !== id) }))
  },
}))
