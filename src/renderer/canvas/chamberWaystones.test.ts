import { describe, expect, it } from 'vitest'
import type { CanvasBoard } from '../../types'
import {
  WAYSTONE_MAX,
  plantWaystoneEvent,
  removeWaystoneEvent,
  renameWaystoneEvent,
  resolveWaystones,
} from './chamberWaystones'

function board(meta?: Record<string, unknown>): CanvasBoard {
  return { id: 'b1', name: 'Chamber', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 }, meta }
}

const stone = (id: string, name = 'Skull studies') => ({ id, name, x: 100, y: -50, scale: 0.8 })

describe('resolveWaystones', () => {
  it('returns empty for boards without waystones', () => {
    expect(resolveWaystones(board())).toEqual([])
  })

  it('normalizes stored waystones and drops malformed entries', () => {
    const stones = resolveWaystones(board({
      waystones: [
        stone('a'),
        { id: 'bad', name: 'no coords' },
        { id: 'b', name: 'Palette wall', x: 1, y: 2, scale: 99 },
        'garbage',
      ],
    }))
    expect(stones.map((s) => s.id)).toEqual(['a', 'b'])
    expect(stones[1].scale).toBeLessThanOrEqual(8)
  })

  it('caps the list at WAYSTONE_MAX', () => {
    const many = Array.from({ length: WAYSTONE_MAX + 5 }, (_, i) => stone(`s${i}`))
    expect(resolveWaystones(board({ waystones: many })).length).toBe(WAYSTONE_MAX)
  })
})

describe('waystone events', () => {
  it('plants a waystone with before/after meta patches', () => {
    const event = plantWaystoneEvent(board(), stone('a'))
    expect(event.before).toEqual({ waystones: [] })
    expect(event.after).toEqual({ waystones: [stone('a')] })
  })

  it('refuses to plant beyond the cap', () => {
    const many = Array.from({ length: WAYSTONE_MAX }, (_, i) => stone(`s${i}`))
    expect(plantWaystoneEvent(board({ waystones: many }), stone('extra'))).toBeNull()
  })

  it('removes a waystone by id', () => {
    const event = removeWaystoneEvent(board({ waystones: [stone('a'), stone('b')] }), 'a')
    expect((event!.after.waystones as unknown[]).length).toBe(1)
    expect((event!.before.waystones as { id: string }[]).map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('renames a waystone', () => {
    const event = renameWaystoneEvent(board({ waystones: [stone('a')] }), 'a', 'The reliquary')
    expect((event!.after.waystones as { name: string }[])[0].name).toBe('The reliquary')
  })

  it('returns null for unknown ids', () => {
    expect(removeWaystoneEvent(board({ waystones: [stone('a')] }), 'zzz')).toBeNull()
    expect(renameWaystoneEvent(board(), 'zzz', 'x')).toBeNull()
  })
})
