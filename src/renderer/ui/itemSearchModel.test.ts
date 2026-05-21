import { describe, expect, it } from 'vitest'
import type { CanvasItem } from '../../types'
import { buildSearchResult, getCommentResults, getSearchResults } from './itemSearchModel'

const baseItem: CanvasItem = {
  id: 'item-1',
  type: 'sticky',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  rotation: 0,
  zIndex: 1,
  locked: false,
  visible: true,
  opacity: 1,
  tags: [],
}

describe('itemSearchModel', () => {
  it('labels comment pins from their content and marks them as comments', () => {
    const result = buildSearchResult({
      ...baseItem,
      id: 'comment-1',
      tags: ['comment', 'pose'],
      meta: { kind: 'comment', attachedTo: 'image-1', content: 'Check the rim light' },
    })

    expect(result.label).toBe('Check the rim light')
    expect(result.detail).toContain('comment')
    expect(result.detail).toContain('attached')
    expect(result.haystack).toContain('rim light')
  })

  it('returns only comment pins for the comment list', () => {
    const comments = getCommentResults([
      { ...baseItem, id: 'normal-sticky', meta: { content: 'plain note' } },
      { ...baseItem, id: 'comment-1', meta: { kind: 'comment', content: 'First comment' } },
      { ...baseItem, id: 'comment-2', meta: { kind: 'comment', content: '' } },
    ])

    expect(comments.map((result) => result.item.id)).toEqual(['comment-1', 'comment-2'])
    expect(comments[1].label).toBe('Untitled comment')
  })

  it('finds comment text through normal item search', () => {
    const results = getSearchResults([
      { ...baseItem, id: 'image-1', type: 'image', src: 'C:/refs/castle.png' },
      { ...baseItem, id: 'comment-1', meta: { kind: 'comment', content: 'Silhouette needs more punch' } },
    ], 'silhouette')

    expect(results.map((result) => result.item.id)).toEqual(['comment-1'])
  })
})
