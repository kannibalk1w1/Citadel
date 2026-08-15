// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { CanvasItem, Viewport } from '../../../types'
import { useUIStore } from '../../store/uiStore'
import { snapLines } from '../overlays/SnapGuides'
import { spatialIndex } from './spatialIndex'
import { snapItem } from './snapEngine'

vi.mock('react-konva', () => ({ Line: () => null }))

const viewport: Viewport = { x: 0, y: 0, scale: 1 }

function item(id: string, x: number, y: number, width = 100, height = 100): CanvasItem {
  return {
    id,
    type: 'image',
    x,
    y,
    width,
    height,
    rotation: 0,
    zIndex: 0,
    locked: false,
    visible: true,
    opacity: 1,
    tags: [],
  }
}

beforeEach(() => {
  Object.assign(window, {
    ipc: { invoke: () => Promise.resolve({ ok: true }) },
  })
  useUIStore.setState({ snapToGrid: true, gridSize: 40 })
  snapLines.length = 0
})

describe('snapItem', () => {
  it('uses the closest item edge snap on each axis', () => {
    const dragged = item('dragged', 194, 20)
    const fartherTarget = item('farther', 300, 20)
    const closerTarget = item('closer', 292, 20)
    const allItems = [dragged, fartherTarget, closerTarget]
    spatialIndex.rebuild(allItems)

    const result = snapItem(dragged, viewport)

    expect(result.x).toBe(192)
    expect(snapLines.filter((line) => line.orientation === 'vertical')).toHaveLength(1)
  })

  it('labels zero-gap docking guides', () => {
    const dragged = item('dragged', 197, 20)
    const target = item('target', 300, 20)
    const allItems = [dragged, target]
    spatialIndex.rebuild(allItems)

    snapItem(dragged, viewport)

    expect(snapLines).toContainEqual(expect.objectContaining({
      orientation: 'vertical',
      label: '0 px',
    }))
  })

  it('measures the gap between aligned items', () => {
    // Left edges align; the items are 60px apart vertically (dragged bottom at
    // 120, target top at 180). Ref Flow shows that number, and now so do we.
    const dragged = item('dragged', 297, 20)
    const target = item('target', 300, 180)
    const allItems = [dragged, target]
    spatialIndex.rebuild(allItems)

    snapItem(dragged, viewport)

    expect(snapLines).toContainEqual(expect.objectContaining({
      orientation: 'vertical',
      label: '60 px',
    }))
  })

  it('measures the gap on horizontal guides too', () => {
    // Top edges align; 40px of clear space between them horizontally.
    const dragged = item('dragged', 20, 97)
    const target = item('target', 160, 100)
    const allItems = [dragged, target]
    spatialIndex.rebuild(allItems)

    snapItem(dragged, viewport)

    expect(snapLines).toContainEqual(expect.objectContaining({
      orientation: 'horizontal',
      label: '40 px',
    }))
  })

  it('does not snap when snapping is off', () => {
    useUIStore.setState({ snapToGrid: false })
    const dragged = item('dragged', 197, 20)
    const target = item('target', 300, 20)
    const allItems = [dragged, target]
    spatialIndex.rebuild(allItems)

    const result = snapItem(dragged, viewport)

    expect(result.x).toBe(197)
    expect(snapLines).toHaveLength(0)
  })

  it('temporarily inverts snapping when requested', () => {
    useUIStore.setState({ snapToGrid: false })
    const dragged = item('dragged', 197, 20)
    const target = item('target', 300, 20)
    const allItems = [dragged, target]
    spatialIndex.rebuild(allItems)

    const result = snapItem(dragged, viewport, { invertSnap: true })

    expect(result.x).toBe(200)
    expect(snapLines.filter((line) => line.orientation === 'vertical')).toHaveLength(1)
  })
})
