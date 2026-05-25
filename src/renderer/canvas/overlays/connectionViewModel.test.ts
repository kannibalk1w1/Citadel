import { describe, expect, it } from 'vitest'
import { bindingEndpointMarks, connectionBindingPulse, connectionLabelPlaque, connectorStrokeWidth, threadMeaningBadgeLabel } from './connectionViewModel'

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

  it('fades thread binding pulses over their duration', () => {
    expect(connectionBindingPulse(1000, 950)).toBeNull()

    const fresh = connectionBindingPulse(1000, 1000)
    expect(fresh?.opacity).toBeCloseTo(0.72)
    expect(fresh?.strokeBoost).toBeGreaterThan(5)

    const fading = connectionBindingPulse(1000, 1450)
    expect(fading?.opacity).toBeLessThan(fresh!.opacity)

    expect(connectionBindingPulse(1000, 1901)).toBeNull()
  })

  it('creates endpoint sigil marks for active and pulsing bindings only', () => {
    expect(bindingEndpointMarks({ x: 10, y: 20 }, { x: 90, y: 40 }, { isActive: false, pulse: null })).toEqual([])

    const activeMarks = bindingEndpointMarks({ x: 10, y: 20 }, { x: 90, y: 40 }, { isActive: true, pulse: null })
    expect(activeMarks).toHaveLength(2)
    expect(activeMarks[0]).toMatchObject({ x: 10, y: 20, radius: 5.5, opacity: 0.68, strokeWidth: 1.25 })

    const pulseMarks = bindingEndpointMarks({ x: 10, y: 20 }, { x: 90, y: 40 }, {
      isActive: false,
      pulse: { opacity: 0.5, strokeBoost: 3 },
    })
    expect(pulseMarks[0].radius).toBeGreaterThan(activeMarks[0].radius)
    expect(pulseMarks[0].opacity).toBeCloseTo(0.5)
  })
})
