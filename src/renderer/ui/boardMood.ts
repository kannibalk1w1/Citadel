import type { CanvasBoard } from '../../types'
import { CHAMBER_MOOD_PRESETS, resolveChamberIdentity } from '../canvas/chamberIdentity'

export function boardMoodAccent(board: CanvasBoard): string {
  const hasAccent = typeof board.meta?.accent === 'string' && board.meta.accent
  const hasMood = CHAMBER_MOOD_PRESETS.some((p) => p.id === board.meta?.mood)
  if (!hasAccent && !hasMood) return 'var(--accent)'
  return resolveChamberIdentity(board).accent
}

export function boardMoodId(board: CanvasBoard): string {
  return resolveChamberIdentity(board).mood
}
