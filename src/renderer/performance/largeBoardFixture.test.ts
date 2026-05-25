import { describe, expect, it } from 'vitest'
import { createLargeBoardFixture, measureBindingOverlayLoad, measureChamberLoad, measureLivingIndexSearch } from './largeBoardFixture'
import type { Connection } from '../../types'

function connection(id: string, fromId: string, toId: string): Connection {
  return {
    id,
    fromId,
    toId,
    fromAnchor: 'auto',
    toAnchor: 'auto',
    style: 'bezier',
    color: '#c8a96e',
    width: 1.5,
    arrowHead: 'arrow',
    dashed: false,
  }
}

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

  it('measures the chamber load readout for a stage-sized large board slice', () => {
    const fixture = createLargeBoardFixture({ itemCount: 1000, columns: 50 })
    const mediaItems = [
      { ...fixture.board.items[0], id: 'fixture-video-near', type: 'video' as const, x: 40, y: 40 },
      { ...fixture.board.items[0], id: 'fixture-audio-selected', type: 'audio' as const, x: 9000, y: 9000 },
      { ...fixture.board.items[0], id: 'fixture-model-offscreen', type: 'model3d' as const, x: 9400, y: 9400 },
    ]

    expect(measureChamberLoad([...fixture.board.items, ...mediaItems], {
      viewport: { x: 0, y: 0, scale: 1 },
      screen: { width: 540, height: 280 },
      overscanPx: 240,
      alwaysIncludeIds: ['fixture-relic-0999', 'fixture-audio-selected'],
    })).toEqual({
      totalRelics: 1003,
      mountedRelics: 23,
      awakeDOMMedia: 2,
      sleepingAnimatedRelics: 1,
    })
  })

  it('measures visible binding overlay load after endpoint sigils', () => {
    const fixture = createLargeBoardFixture({ itemCount: 1000, columns: 50 })
    const connections = [
      connection('visible-thread', 'fixture-relic-0000', 'fixture-relic-0001'),
      connection('sleeping-thread', 'fixture-relic-0900', 'fixture-relic-0901'),
      connection('active-thread', 'fixture-relic-0902', 'fixture-relic-0903'),
      connection('pulsing-thread', 'fixture-relic-0904', 'fixture-relic-0905'),
    ]

    expect(measureBindingOverlayLoad(fixture.board.items, connections, {
      viewport: { x: 0, y: 0, scale: 1 },
      screen: { width: 540, height: 280 },
      overscanPx: 240,
      activeConnectionId: 'active-thread',
      pulsingConnectionId: 'pulsing-thread',
    })).toEqual({
      renderedConnections: 3,
      activeOrPulsingConnections: 2,
      endpointSigilMarks: 4,
    })
  })
})
