import { describe, expect, it } from 'vitest'
import type { CanvasBoard } from '../../types'
import { boardMoodAccent } from './boardMood'

const board: CanvasBoard = {
  id: 'board-1',
  name: 'Board',
  items: [],
  connections: [],
  viewport: { x: 0, y: 0, scale: 1 },
}

describe('boardMood', () => {
  it('uses the board metadata accent when it is set', () => {
    expect(boardMoodAccent({ ...board, meta: { accent: '#65798a' } })).toBe('#65798a')
  })

  it('falls back to the theme accent when no board accent is set', () => {
    expect(boardMoodAccent(board)).toBe('var(--accent)')
  })
})
