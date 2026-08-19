import { describe, expect, it } from 'vitest'
import type { CanvasItem, Viewport } from '../../../types'
import { consumeMarqueeSweep, itemsInMarquee, markMarqueeSweep, marqueeIsLive, marqueeRect } from './marqueeSelection'

const relic = (over: Partial<CanvasItem> & { id: string }): CanvasItem => ({
  type: 'image', x: 0, y: 0, width: 100, height: 100,
  rotation: 0, zIndex: 0, locked: false, visible: true, opacity: 1, tags: [],
  ...over,
})

const viewport = (scale: number): Viewport => ({ x: 0, y: 0, scale })

describe('marqueeRect', () => {
  it('normalises a drag made in any direction', () => {
    const downLeft = marqueeRect({ x: 100, y: 100 }, { x: 20, y: 40 })
    expect(downLeft).toEqual({ x: 20, y: 40, width: 80, height: 60 })
    expect(marqueeRect({ x: 20, y: 40 }, { x: 100, y: 100 })).toEqual(downLeft)
  })
})

describe('marqueeIsLive', () => {
  it('ignores a press that barely moved, so a click still just deselects', () => {
    expect(marqueeIsLive({ x: 0, y: 0, width: 2, height: 1 }, viewport(1))).toBe(false)
  })

  it('measures the threshold on screen, not on canvas', () => {
    const tiny = { x: 0, y: 0, width: 3, height: 0 }
    // 3 canvas px is under the threshold at 1x but well over it zoomed in.
    expect(marqueeIsLive(tiny, viewport(1))).toBe(false)
    expect(marqueeIsLive(tiny, viewport(4))).toBe(true)
  })
})

describe('itemsInMarquee', () => {
  const items = [
    relic({ id: 'inside', x: 10, y: 10 }),
    relic({ id: 'grazed', x: 190, y: 190 }),
    relic({ id: 'outside', x: 400, y: 400 }),
    relic({ id: 'locked', x: 10, y: 10, locked: true }),
    relic({ id: 'hidden', x: 10, y: 10, visible: false }),
  ]

  it('takes everything the band touches, not only what it swallows whole', () => {
    const ids = itemsInMarquee(items, { x: 0, y: 0, width: 200, height: 200 })
    expect(ids).toContain('inside')
    expect(ids).toContain('grazed')
    expect(ids).not.toContain('outside')
  })

  it('leaves locked and hidden relics where they are', () => {
    const ids = itemsInMarquee(items, { x: 0, y: 0, width: 200, height: 200 })
    expect(ids).not.toContain('locked')
    expect(ids).not.toContain('hidden')
  })

  it('touching edges alone does not count as a hit', () => {
    // A relic ending exactly where the band starts was never swept over.
    expect(itemsInMarquee([relic({ id: 'edge', x: 0, y: 0 })], { x: 100, y: 0, width: 50, height: 50 })).toEqual([])
  })
})

describe('the sweep flag', () => {
  it('swallows exactly one click, the one that ends the sweep', () => {
    markMarqueeSweep()

    expect(consumeMarqueeSweep()).toBe(true)
    expect(consumeMarqueeSweep()).toBe(false)
  })

  it('says nothing happened when no sweep ran', () => {
    expect(consumeMarqueeSweep()).toBe(false)
  })
})
