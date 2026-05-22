import type { CanvasBoard } from '../../types'

export function boardMoodAccent(board: CanvasBoard): string {
  return typeof board.meta?.accent === 'string' ? board.meta.accent : 'var(--accent)'
}

export function boardMoodId(board: CanvasBoard): string {
  return typeof board.meta?.mood === 'string' ? board.meta.mood : 'gothic'
}
