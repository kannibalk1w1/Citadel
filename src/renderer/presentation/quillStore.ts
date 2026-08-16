import { create } from 'zustand'
import { nanoid } from 'nanoid'

// Presenter pen palette: board accent first, then two neutral inks. The accent
// is a CSS variable because it resolves inside the canvas container where the
// overlay mounts; the neutrals are literals so they read the same in both themes.
export const QUILL_COLORS = [
  'var(--chamber-accent, #c8a96e)',
  '#ffffff',
  '#c8c8c8',
] as const

export const QUILL_WIDTHS = [2.5, 5] as const

export type QuillStroke = {
  id: string
  points: number[] // screen-space x,y pairs
  color: string
  width: number
}

type QuillState = {
  active: boolean
  color: string
  width: number
  strokes: QuillStroke[]
  drawing: QuillStroke | null

  toggleActive: () => void
  setColor: (color: string) => void
  setWidth: (width: number) => void
  beginStroke: (x: number, y: number) => void
  extendStroke: (x: number, y: number) => void
  endStroke: () => void
  undoStroke: () => void
  clearStrokes: () => void
  reset: () => void
}

const DEFAULTS = {
  active: false,
  color: QUILL_COLORS[0] as string,
  width: QUILL_WIDTHS[0] as number,
  strokes: [] as QuillStroke[],
  drawing: null,
}

// Ephemeral presenter annotations. Deliberately NOT part of historyStore:
// strokes are not canvas mutations and must never enter undo or recordings.
export const useQuillStore = create<QuillState>((set, get) => ({
  ...DEFAULTS,

  toggleActive: () => set((s) => ({ active: !s.active, drawing: null })),
  setColor: (color) => set({ color }),
  setWidth: (width) => set({ width }),

  beginStroke: (x, y) => {
    const { color, width } = get()
    set({ drawing: { id: nanoid(), points: [x, y], color, width } })
  },

  extendStroke: (x, y) => {
    const { drawing } = get()
    if (!drawing) return
    set({ drawing: { ...drawing, points: [...drawing.points, x, y] } })
  },

  endStroke: () => {
    const { drawing, strokes } = get()
    if (!drawing) return
    // A click without movement is not a stroke.
    const kept = drawing.points.length >= 4 ? [...strokes, drawing] : strokes
    set({ strokes: kept, drawing: null })
  },

  undoStroke: () => set((s) => ({ strokes: s.strokes.slice(0, -1) })),
  clearStrokes: () => set({ strokes: [], drawing: null }),
  reset: () => set({ ...DEFAULTS }),
}))
