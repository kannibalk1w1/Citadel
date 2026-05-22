import { describe, expect, it } from 'vitest'
import { imageFitRect, imageCoverCrop } from './imageFit'

describe('imageFit', () => {
  it('fits a wide image inside a square frame without cropping', () => {
    expect(imageFitRect(200, 100, 100, 100)).toEqual({ x: 0, y: 25, width: 100, height: 50 })
  })

  it('crops a wide image to cover a square frame', () => {
    expect(imageCoverCrop(200, 100, 100, 100)).toEqual({ x: 50, y: 0, width: 100, height: 100 })
  })
})
