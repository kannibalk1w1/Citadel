import { describe, expect, it } from 'vitest'
import { connectionLabelPlaque, connectorStrokeWidth, threadMeaningBadgeLabel } from './connectionViewModel'

describe('connectionViewModel', () => {
  it('centres a mindmap label plaque between connector endpoints', () => {
    const plaque = connectionLabelPlaque({ x: 10, y: 20 }, { x: 110, y: 80 }, 'requires')

    expect(plaque.x).toBe(60)
    expect(plaque.y).toBe(50)
    expect(plaque.textX).toBe(60)
    expect(plaque.textY).toBe(54)
    expect(plaque.width).toBeGreaterThan(44)
    expect(plaque.height).toBe(22)
  })

  it('clamps very long label plaques', () => {
    const plaque = connectionLabelPlaque({ x: 0, y: 0 }, { x: 10, y: 10 }, 'a very long connector label that should not dominate the canvas')

    expect(plaque.width).toBe(180)
  })

  it('thickens active connector strokes', () => {
    expect(connectorStrokeWidth(2, false)).toBe(2)
    expect(connectorStrokeWidth(2, true)).toBe(4)
  })

  it('adds room for thread meaning badges on plaques', () => {
    const plaque = connectionLabelPlaque({ x: 10, y: 20 }, { x: 110, y: 80 }, 'requires', 'memory')

    expect(plaque.height).toBeGreaterThan(22)
    expect(plaque.badgeText).toBe('MEMORY')
    expect(plaque.badgeY).toBeGreaterThan(plaque.textY)
  })

  it('formats thread meaning badge labels', () => {
    expect(threadMeaningBadgeLabel('source')).toBe('SOURCE')
    expect(threadMeaningBadgeLabel(undefined)).toBeNull()
  })
})
