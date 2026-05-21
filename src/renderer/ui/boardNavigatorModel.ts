import type { CanvasBoard } from '../../types'

export type BoardSummary = {
  itemCount: number
  visibleCount: number
  commentCount: number
  presentationCount: number
  connectionCount: number
}

export function summarizeBoard(board: CanvasBoard): BoardSummary {
  return {
    itemCount: board.items.length,
    visibleCount: board.items.filter((item) => item.visible !== false).length,
    commentCount: board.items.filter((item) => item.type === 'sticky' && item.meta?.kind === 'comment').length,
    presentationCount: board.items.filter((item) => item.visible !== false && item.meta?.skipPresentation !== true).length,
    connectionCount: board.connections.length,
  }
}
