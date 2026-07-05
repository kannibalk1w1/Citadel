import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../../types'
import { WAYMARK_MAX, addWaymarkPatch, removeWaymarkPatch, resolveWaymarks, setWaymarkLabelPatch } from './waymarks'

function item(meta?: Record<string, unknown>): CanvasItem {
  return {
    id: 'img1', type: 'image',
    x: 0, y: 0, width: 400, height: 300,
    rotation: 0, zIndex: 0, locked: false, visible: true, opacity: 1, tags: [],
    src: 'C:/refs/map.png',
    meta,
  }
}

const mark = (id: string, label = 'gate') => ({ id, u: 0.25, v: 0.5, label })

describe('resolveWaymarks', () => {
  it('returns empty without meta', () => {
    expect(resolveWaymarks(item())).toEqual([])
  })

  it('normalizes marks, clamps uv, drops malformed, caps the list', () => {
    const marks = resolveWaymarks(item({
      waymarks: [
        mark('a'),
        { id: 'b', u: 2, v: -1, label: 'off-map' },
        { id: '', u: 0.1, v: 0.1, label: 'no id' },
        'junk',
        ...Array.from({ length: WAYMARK_MAX + 4 }, (_, i) => mark(`extra-${i}`)),
      ],
    }))
    expect(marks.length).toBe(WAYMARK_MAX)
    expect(marks[1]).toEqual({ id: 'b', u: 1, v: 0, label: 'off-map' })
  })
})

describe('waymark patches', () => {
  it('adds a waymark with full-meta before/after for ITEM_STYLE undo', () => {
    const target = item({ content: 'keep me' })
    const patch = addWaymarkPatch(target, mark('a'))
    expect(patch!.before.meta).toEqual({ content: 'keep me' })
    expect((patch!.after.meta as { waymarks: unknown[] }).waymarks).toEqual([mark('a')])
    expect((patch!.after.meta as { content: string }).content).toBe('keep me')
  })

  it('refuses beyond the cap', () => {
    const full = item({ waymarks: Array.from({ length: WAYMARK_MAX }, (_, i) => mark(`m${i}`)) })
    expect(addWaymarkPatch(full, mark('extra'))).toBeNull()
  })

  it('removes and relabels by id', () => {
    const target = item({ waymarks: [mark('a'), mark('b')] })
    const removed = removeWaymarkPatch(target, 'a')
    expect((removed!.after.meta as { waymarks: { id: string }[] }).waymarks.map((m) => m.id)).toEqual(['b'])
    const relabeled = setWaymarkLabelPatch(target, 'b', 'postern gate')
    expect((relabeled!.after.meta as { waymarks: { label: string }[] }).waymarks[1].label).toBe('postern gate')
    expect(removeWaymarkPatch(target, 'zzz')).toBeNull()
  })
})
