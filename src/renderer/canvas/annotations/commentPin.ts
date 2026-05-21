import type { CanvasItem } from '../../../types'

export type CommentPinPoint = { x: number; y: number }

type CreateCommentPinArgs = {
  id: string
  target?: CanvasItem | null
  point?: CommentPinPoint
  zIndex: number
}

const COMMENT_WIDTH = 220
const COMMENT_HEIGHT = 96
const COMMENT_GAP = 24

export function createCommentPinItem({ id, target, point, zIndex }: CreateCommentPinArgs): CanvasItem {
  const x = target ? target.x + target.width + COMMENT_GAP : point?.x ?? 0
  const y = target ? target.y : point?.y ?? 0
  const inheritedTags = target?.tags ?? []

  return {
    id,
    type: 'sticky',
    x,
    y,
    width: COMMENT_WIDTH,
    height: COMMENT_HEIGHT,
    rotation: 0,
    zIndex,
    locked: false,
    visible: true,
    opacity: 1,
    tags: Array.from(new Set(['comment', ...inheritedTags])),
    meta: {
      kind: 'comment',
      attachedTo: target?.id,
      content: '',
      color: '#241d16',
      fontSize: 13,
      align: 'left',
      fontStyle: 'normal',
    },
  }
}
