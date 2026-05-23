import { beforeEach, describe, expect, it } from 'vitest'
import { useCanvasStore } from './canvasStore'

beforeEach(() => {
  useCanvasStore.setState({
    boards: [
      {
        id: 'board-1',
        name: 'Board 1',
        items: [],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
        meta: { mood: 'gothic', accent: '#bd9652' },
      },
    ],
    activeBoardId: 'board-1',
    selectedIds: [],
  })
})

describe('canvasStore - board metadata', () => {
  it('updates board metadata without replacing existing fields', () => {
    useCanvasStore.getState().updateBoardMeta('board-1', { mood: 'ember' })

    expect(useCanvasStore.getState().boards[0].meta).toEqual({
      mood: 'ember',
      accent: '#bd9652',
    })
  })
})

describe('canvasStore - active board item helpers', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      boards: [
        {
          id: 'board-1',
          name: 'Board 1',
          items: [
            {
              id: 'item-1',
              type: 'image',
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              rotation: 0,
              zIndex: 2,
              locked: false,
              visible: true,
              opacity: 1,
              tags: [],
            },
            {
              id: 'item-2',
              type: 'image',
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              rotation: 0,
              zIndex: 1,
              locked: false,
              visible: true,
              opacity: 1,
              tags: [],
            },
            {
              id: 'item-3',
              type: 'image',
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              rotation: 0,
              zIndex: 3,
              locked: true,
              visible: true,
              opacity: 1,
              tags: [],
            },
          ],
          connections: [],
          viewport: { x: 0, y: 0, scale: 1 },
        },
      ],
      activeBoardId: 'board-1',
      selectedIds: ['item-1', 'item-3'],
    })
  })

  it('returns selected items in board order', () => {
    expect(useCanvasStore.getState().selectedItems().map((item) => item.id)).toEqual(['item-1', 'item-3'])
  })

  it('returns selected unlocked items', () => {
    expect(useCanvasStore.getState().selectedUnlockedItems().map((item) => item.id)).toEqual(['item-1'])
  })

  it('returns active board items sorted by z-index', () => {
    expect(useCanvasStore.getState().sortedItems().map((item) => item.id)).toEqual(['item-2', 'item-1', 'item-3'])
  })
})
