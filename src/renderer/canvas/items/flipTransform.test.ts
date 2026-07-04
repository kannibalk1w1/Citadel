import { describe, expect, it } from 'vitest'
import { flipProps, itemFlip } from './flipTransform'

describe('flipProps', () => {
  it('is identity when no flip is set', () => {
    expect(flipProps(false, false, 200, 100)).toEqual({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 })
  })

  it('mirrors horizontally in place', () => {
    // With scaleX -1 and offsetX = width, content spans the same rect mirrored.
    expect(flipProps(true, false, 200, 100)).toEqual({ scaleX: -1, scaleY: 1, offsetX: 200, offsetY: 0 })
  })

  it('mirrors vertically in place', () => {
    expect(flipProps(false, true, 200, 100)).toEqual({ scaleX: 1, scaleY: -1, offsetX: 0, offsetY: 100 })
  })

  it('mirrors both axes', () => {
    expect(flipProps(true, true, 200, 100)).toEqual({ scaleX: -1, scaleY: -1, offsetX: 200, offsetY: 100 })
  })
})

describe('itemFlip', () => {
  it('reads flip flags from item meta with false defaults', () => {
    expect(itemFlip(undefined)).toEqual({ flipX: false, flipY: false })
    expect(itemFlip({ flipX: true })).toEqual({ flipX: true, flipY: false })
    expect(itemFlip({ flipX: 'yes', flipY: true })).toEqual({ flipX: false, flipY: true })
  })
})
