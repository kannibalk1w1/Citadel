import { describe, expect, it } from 'vitest'
import {
  clampOpacity,
  defaultWindowMode,
  MAX_WINDOW_OPACITY,
  MIN_WINDOW_OPACITY,
  nextWindowMode,
  usesRendererOpacityFallback,
  type WindowModeState,
} from './windowModes'

const onTop: WindowModeState = { alwaysOnTop: true, opacity: 1, clickThrough: false }

describe('clampOpacity', () => {
  it('holds a floor so the window cannot be made invisible', () => {
    expect(clampOpacity(0)).toBe(MIN_WINDOW_OPACITY)
    expect(clampOpacity(-4)).toBe(MIN_WINDOW_OPACITY)
  })

  it('caps at fully opaque and rejects nonsense', () => {
    expect(clampOpacity(2)).toBe(MAX_WINDOW_OPACITY)
    expect(clampOpacity(Number.NaN)).toBe(MAX_WINDOW_OPACITY)
    expect(clampOpacity('0.5')).toBe(MAX_WINDOW_OPACITY)
    expect(clampOpacity(undefined)).toBe(MAX_WINDOW_OPACITY)
  })

  it('passes through a value in range', () => {
    expect(clampOpacity(0.62)).toBe(0.62)
  })
})

describe('usesRendererOpacityFallback', () => {
  it('uses a transparent renderer on Linux, where Electron opacity is a no-op', () => {
    expect(usesRendererOpacityFallback('linux')).toBe(true)
    expect(usesRendererOpacityFallback('win32')).toBe(false)
    expect(usesRendererOpacityFallback('darwin')).toBe(false)
  })
})

describe('nextWindowMode', () => {
  it('leaves untouched modes alone', () => {
    expect(nextWindowMode(onTop, {})).toEqual(onTop)
  })

  it('raises the window when click-through is turned on', () => {
    // Click-through under other windows would be unreachable and pointless.
    const next = nextWindowMode(defaultWindowMode, { clickThrough: true })

    expect(next.clickThrough).toBe(true)
    expect(next.alwaysOnTop).toBe(true)
  })

  it('drops click-through when the window stops being on top', () => {
    const clickingThrough = nextWindowMode(defaultWindowMode, { clickThrough: true })

    const next = nextWindowMode(clickingThrough, { alwaysOnTop: false })

    expect(next.alwaysOnTop).toBe(false)
    expect(next.clickThrough).toBe(false)
  })

  it('lets an explicit stop-staying-on-top win over a contradictory request', () => {
    const clickingThrough = nextWindowMode(defaultWindowMode, { clickThrough: true })

    const next = nextWindowMode(clickingThrough, { alwaysOnTop: false, clickThrough: true })

    expect(next).toEqual({ alwaysOnTop: false, opacity: 1, clickThrough: false })
  })

  it('keeps the window raised while click-through is inherited', () => {
    const clickingThrough = nextWindowMode(defaultWindowMode, { clickThrough: true })

    const next = nextWindowMode(clickingThrough, { opacity: 0.5 })

    expect(next).toEqual({ alwaysOnTop: true, opacity: 0.5, clickThrough: true })
  })

  it('clamps a requested opacity', () => {
    expect(nextWindowMode(defaultWindowMode, { opacity: 0.05 }).opacity).toBe(MIN_WINDOW_OPACITY)
  })
})
