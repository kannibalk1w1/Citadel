import { beforeEach, describe, expect, it } from 'vitest'
import { QUILL_COLORS, QUILL_WIDTHS, useQuillStore } from './quillStore'

const initial = () => useQuillStore.getState()

describe('quillStore', () => {
  beforeEach(() => {
    useQuillStore.getState().reset()
  })

  it('starts inactive with defaults', () => {
    const s = initial()
    expect(s.active).toBe(false)
    expect(s.strokes).toEqual([])
    expect(s.color).toBe(QUILL_COLORS[0])
    expect(s.width).toBe(QUILL_WIDTHS[0])
  })

  it('draws a stroke through begin/extend/end', () => {
    const s = initial()
    s.beginStroke(10, 20)
    useQuillStore.getState().extendStroke(15, 25)
    useQuillStore.getState().extendStroke(20, 30)
    useQuillStore.getState().endStroke()
    const strokes = useQuillStore.getState().strokes
    expect(strokes.length).toBe(1)
    expect(strokes[0].points).toEqual([10, 20, 15, 25, 20, 30])
    expect(useQuillStore.getState().drawing).toBeNull()
  })

  it('records the active colour and width on each stroke', () => {
    const s = initial()
    s.setColor(QUILL_COLORS[1])
    s.setWidth(QUILL_WIDTHS[1])
    useQuillStore.getState().beginStroke(0, 0)
    useQuillStore.getState().extendStroke(4, 4)
    useQuillStore.getState().endStroke()
    const stroke = useQuillStore.getState().strokes[0]
    expect(stroke.color).toBe(QUILL_COLORS[1])
    expect(stroke.width).toBe(QUILL_WIDTHS[1])
  })

  it('discards empty strokes with fewer than two points', () => {
    initial().beginStroke(5, 5)
    useQuillStore.getState().endStroke()
    expect(useQuillStore.getState().strokes).toEqual([])
  })

  it('undoes the last stroke only', () => {
    const draw = (x: number) => {
      useQuillStore.getState().beginStroke(x, 0)
      useQuillStore.getState().extendStroke(x + 5, 5)
      useQuillStore.getState().endStroke()
    }
    draw(0)
    draw(100)
    useQuillStore.getState().undoStroke()
    expect(useQuillStore.getState().strokes.length).toBe(1)
    expect(useQuillStore.getState().strokes[0].points[0]).toBe(0)
  })

  it('clears all strokes but keeps the quill active', () => {
    const s = initial()
    s.toggleActive()
    useQuillStore.getState().beginStroke(0, 0)
    useQuillStore.getState().extendStroke(1, 1)
    useQuillStore.getState().endStroke()
    useQuillStore.getState().clearStrokes()
    expect(useQuillStore.getState().strokes).toEqual([])
    expect(useQuillStore.getState().active).toBe(true)
  })

  it('reset returns everything to defaults (presentation exit)', () => {
    const s = initial()
    s.toggleActive()
    s.setColor(QUILL_COLORS[2])
    useQuillStore.getState().beginStroke(0, 0)
    useQuillStore.getState().extendStroke(1, 1)
    useQuillStore.getState().endStroke()
    useQuillStore.getState().reset()
    const after = useQuillStore.getState()
    expect(after.active).toBe(false)
    expect(after.strokes).toEqual([])
    expect(after.color).toBe(QUILL_COLORS[0])
  })
})
