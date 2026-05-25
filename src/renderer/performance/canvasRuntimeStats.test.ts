import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../types'
import { canvasRuntimeStats } from './canvasRuntimeStats'

function item(id: string, type: CanvasItem['type'], visible = true): CanvasItem {
  return {
    id,
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    locked: false,
    visible,
    opacity: 1,
    tags: [],
    src: `${id}.asset`,
  }
}

describe('canvasRuntimeStats', () => {
  it('counts mounted relics, awake DOM media, and sleeping animated relics', () => {
    const allItems = [
      item('near-note', 'text'),
      item('near-video', 'video'),
      item('sleeping-gif', 'gif'),
      item('sleeping-model', 'model3d'),
      item('hidden-video', 'video', false),
    ]
    const renderedItems = [allItems[0], allItems[1]]

    expect(canvasRuntimeStats(allItems, renderedItems)).toEqual({
      totalRelics: 5,
      mountedRelics: 2,
      awakeDOMMedia: 1,
      sleepingAnimatedRelics: 2,
    })
  })
})
