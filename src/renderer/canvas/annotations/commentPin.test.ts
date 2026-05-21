import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../../types'
import { createCommentPinItem } from './commentPin'

const target: CanvasItem = {
  id: 'image-1',
  type: 'image',
  x: 100,
  y: 200,
  width: 320,
  height: 180,
  rotation: 0,
  zIndex: 4,
  locked: false,
  visible: true,
  opacity: 1,
  tags: ['castle', 'lighting'],
}

describe('createCommentPinItem', () => {
  it('places an attached comment pin to the right of the target item', () => {
    const comment = createCommentPinItem({
      id: 'comment-1',
      target,
      zIndex: 9,
    })

    expect(comment).toMatchObject({
      id: 'comment-1',
      type: 'sticky',
      x: target.x + target.width + 24,
      y: target.y,
      width: 220,
      height: 96,
      zIndex: 9,
      tags: ['comment', 'castle', 'lighting'],
      meta: {
        kind: 'comment',
        attachedTo: target.id,
        content: '',
      },
    })
  })

  it('creates a free comment pin at the requested canvas point without a target', () => {
    const comment = createCommentPinItem({
      id: 'comment-2',
      point: { x: -50, y: 75 },
      zIndex: 10,
    })

    expect(comment.x).toBe(-50)
    expect(comment.y).toBe(75)
    expect(comment.meta?.attachedTo).toBeUndefined()
    expect(comment.tags).toEqual(['comment'])
  })
})
