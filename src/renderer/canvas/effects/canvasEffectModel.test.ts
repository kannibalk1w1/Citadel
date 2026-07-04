import { describe, expect, it } from 'vitest'
import { canvasEffectForMascotEffect, resolveCanvasEffectSource } from './canvasEffectModel'

describe('canvasEffectModel', () => {
  it('maps existing action effects to grounded canvas breach effects', () => {
    expect(canvasEffectForMascotEffect('rune-seal')?.kind).toBe('save-blue-flame')
    expect(canvasEffectForMascotEffect('crumble')?.kind).toBe('delete-red-flame')
    expect(canvasEffectForMascotEffect('lightning-in')?.kind).toBe('import-yellow-spark')
    expect(canvasEffectForMascotEffect('lightning-out')?.kind).toBe('export-white-ignition')
    expect(canvasEffectForMascotEffect('fracture')?.kind).toBe('error-red-fracture')
  })

  it('assigns bold non-pixel arcane motifs for each effect family', () => {
    expect(canvasEffectForMascotEffect('rune-seal')?.motif).toBe('blue-flame-ring')
    expect(canvasEffectForMascotEffect('lightning-in')?.motif).toBe('gold-particle-ring')
    expect(canvasEffectForMascotEffect('crumble')?.motif).toBe('red-collapse-flame')
    expect(canvasEffectForMascotEffect('banner-raise')?.motif).toBe('magenta-sigil-slash')
  })

  it('returns no breach effect for tower-only ambience', () => {
    expect(canvasEffectForMascotEffect('rise-from-fog')).toBeNull()
    expect(canvasEffectForMascotEffect('ember-drift')).toBeNull()
  })

  it('prefers target, then last pointer, then visible center for source position', () => {
    const viewport = { x: 20, y: 40, scale: 2 }
    const size = { width: 1000, height: 700 }

    expect(resolveCanvasEffectSource({
      target: { x: 12, y: 24 },
      lastPointer: { x: 1, y: 2 },
      viewport,
      size,
    })).toEqual({ x: 12, y: 24 })

    expect(resolveCanvasEffectSource({
      lastPointer: { x: 1, y: 2 },
      viewport,
      size,
    })).toEqual({ x: 1, y: 2 })

    expect(resolveCanvasEffectSource({ viewport, size })).toEqual({ x: 240, y: 155 })
  })
})
