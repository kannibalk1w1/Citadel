import { describe, expect, it } from 'vitest'
import { createLargeBoardFixture, measureLivingIndexSearch } from './largeBoardFixture'

describe('largeBoardFixture', () => {
  it('creates a deterministic large chamber with predictable Index matches', () => {
    const fixture = createLargeBoardFixture({ itemCount: 1000, columns: 50, matchEvery: 4 })

    expect(fixture.query).toBe('tag:index-probe')
    expect(fixture.expectedMatchCount).toBe(250)
    expect(fixture.expectedMarkCount).toBe(24)
    expect(fixture.board.items).toHaveLength(1000)
    expect(fixture.board.items[0]).toMatchObject({
      id: 'fixture-relic-0000',
      type: 'image',
      x: 0,
      y: 0,
      tags: ['index-probe', 'memory'],
    })
    expect(fixture.board.items[1]).toMatchObject({
      id: 'fixture-relic-0001',
      x: 180,
      y: 0,
      tags: ['archive'],
    })
    expect(fixture.board.items[50]).toMatchObject({
      id: 'fixture-relic-0050',
      x: 0,
      y: 140,
    })
  })

  it('measures Living Index search and capped mark counts without wall-clock assertions', () => {
    const fixture = createLargeBoardFixture({ itemCount: 1000, matchEvery: 4 })
    const times = [12, 15.5]

    const measurement = measureLivingIndexSearch(fixture.board.items, fixture.query, {
      markLimit: 24,
      now: () => times.shift() ?? 15.5,
    })

    expect(measurement).toEqual({
      durationMs: 3.5,
      resultCount: 250,
      markCount: 24,
      firstResultIds: ['fixture-relic-0000', 'fixture-relic-0004', 'fixture-relic-0008', 'fixture-relic-0012', 'fixture-relic-0016'],
    })
  })
})
