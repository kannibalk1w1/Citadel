import { describe, expect, it } from 'vitest'
import type { CanvasBoard, CanvasItem } from '../../types'
import { summarizeBoard } from './boardNavigatorModel'

function item(id: string, type: CanvasItem['type'], meta: Record<string, unknown> = {}): CanvasItem {
  return {
    id,
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    rotation: 0,
    zIndex: 0,
    locked: false,
    visible: true,
    opacity: 1,
    tags: [],
    meta,
  }
}

function board(items: CanvasItem[]): CanvasBoard {
  return {
    id: 'board-1',
    name: 'Mood board',
    items,
    connections: [{ id: 'c1', fromId: 'a', toId: 'b', fromAnchor: 'auto', toAnchor: 'auto', style: 'bezier', color: '#fff', width: 1, arrowHead: 'arrow', dashed: false }],
    viewport: { x: 0, y: 0, scale: 1 },
  }
}

describe('summarizeBoard', () => {
  it('counts items, comments, visible items, and presentation items', () => {
    const summary = summarizeBoard(board([
      item('a', 'image'),
      item('b', 'sticky', { kind: 'comment' }),
      { ...item('c', 'text'), visible: false },
      item('d', 'swatch', { skipPresentation: true }),
    ]))

    expect(summary).toEqual({
      itemCount: 4,
      visibleCount: 3,
      commentCount: 1,
      presentationCount: 2,
      connectionCount: 1,
    })
  })
})
