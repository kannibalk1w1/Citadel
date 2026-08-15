import { describe, expect, it } from 'vitest'
import { resizeFromHandle } from './domResize'

describe('resizeFromHandle', () => {
  const rect = { x: 100, y: 200, width: 80, height: 60 }

  it('resizes from every corner while keeping the opposite corner fixed', () => {
    expect(resizeFromHandle(rect, 'top-left', -20, -10, 32)).toEqual({ x: 80, y: 190, width: 100, height: 70 })
    expect(resizeFromHandle(rect, 'bottom-right', 20, 10, 32)).toEqual({ x: 100, y: 200, width: 100, height: 70 })
  })

  it('resizes from the edges and never crosses the minimum size', () => {
    expect(resizeFromHandle(rect, 'left', 70, 0, 32)).toEqual({ x: 148, y: 200, width: 32, height: 60 })
    expect(resizeFromHandle(rect, 'top', 0, 50, 32)).toEqual({ x: 100, y: 228, width: 80, height: 32 })
  })
})
