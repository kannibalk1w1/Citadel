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
