// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { useUIStore } from '../../store/uiStore'
import { snapLines } from '../overlays/SnapGuides'
import { DOMItem } from './DOMItem'

// SnapGuides pulls in react-konva, which needs the native canvas module here.
vi.mock('react-konva', () => ({
  Line: () => null,
  Text: () => null,
  Rect: () => null,
}))

// DOM-layer items (video, YouTube, audio, 3D) move through DOMItem's pointer
// handlers rather than Konva's drag events. That path bypassed the snap engine
// entirely until 2026-08-15, and no test covered it — hence this file.

const dragged: CanvasItem = {
  id: 'dom-1',
  type: 'model3d',
  x: 20,
  y: 30,
  width: 320,
  height: 180,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
  src: 'C:/archive/tower.glb',
}

// Sits so that a 68px drag puts the dragged item's right edge 2px short of this
// item's left edge — inside the 8px snap threshold, and far enough from the
// 40px grid that grid snapping cannot account for the result.
const target: CanvasItem = { ...dragged, id: 'target-1', type: 'image', x: 410, y: 30, width: 100, height: 100 }

function drag(clientX: number, options: { ctrlKey?: boolean } = {}): void {
  const handle = screen.getByTitle('Move')
  fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 })
  fireEvent.pointerMove(handle, { pointerId: 1, clientX, clientY: 0, ...options })
}

function draggedItem(): CanvasItem {
  return useCanvasStore.getState().items().find((item) => item.id === 'dom-1')!
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
  snapLines.length = 0
  useCanvasStore.setState({
    boards: [{
      id: 'board-1',
      name: 'Board',
      items: [dragged, target],
      connections: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }],
    activeBoardId: 'board-1',
    selectedIds: ['dom-1'],
  })
  useUIStore.setState({ toolMode: 'select', snapToGrid: true, gridSize: 40 })
})

afterEach(() => cleanup())

describe('DOMItem dragging', () => {
  it('snaps a dragged DOM item to a neighbouring edge', () => {
    render(<DOMItem item={dragged} editableFrame><div /></DOMItem>)

    drag(68)

    // Unsnapped the drag would land on x=88 (right edge 408); the edge snap
    // pulls the right edge onto the neighbour's left edge at 410.
    expect(draggedItem().x).toBe(90)
    expect(draggedItem().y).toBe(30)
  })

  it('publishes snap guides while dragging a DOM item', () => {
    render(<DOMItem item={dragged} editableFrame><div /></DOMItem>)

    drag(68)

    expect(snapLines.length).toBeGreaterThan(0)
  })

  it('lets ctrl invert snapping mid-drag, as the Konva layer does', () => {
    render(<DOMItem item={dragged} editableFrame><div /></DOMItem>)

    drag(68, { ctrlKey: true })

    expect(draggedItem().x).toBe(88)
    expect(snapLines).toHaveLength(0)
  })

  it('leaves the item content clickable while selected', () => {
    // The move affordance used to be a full-surface overlay, which would have
    // swallowed every click on native media controls.
    const onPlay = vi.fn()
    render(
      <DOMItem item={dragged} editableFrame>
        <button type="button" onClick={onPlay}>Play</button>
      </DOMItem>
    )

    fireEvent.click(screen.getByText('Play'))

    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('does not snap while resizing', () => {
    render(<DOMItem item={dragged} editableFrame><div /></DOMItem>)

    const handle = screen.getByTestId('resize-bottom-right')
    fireEvent.pointerDown(handle, { pointerId: 2, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 12, clientY: 8 })

    expect(draggedItem().width).toBe(332)
    expect(draggedItem().height).toBe(188)
  })
})
