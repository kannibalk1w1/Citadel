import { describe, expect, it } from 'vitest'
import type { CanvasBoard, CanvasItem, Connection } from '../../types'
import { buildSearchResult, firstRelatedThread, getArchiveIndexResults, getCommentResults, getIndexResults, getSearchResults, groupSearchResults, indexKeyAction, nextSearchResultIndex, resultBadgeLabel, threadFocusPoint } from './itemSearchModel'

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

const baseConnection: Connection = {
  id: 'thread-1',
  fromId: 'image-1',
  toId: 'note-1',
  fromAnchor: 'auto',
  toAnchor: 'auto',
  style: 'bezier',
  color: '#bd9652',
  width: 1,
  arrowHead: 'arrow',
  label: 'source memory',
  dashed: false,
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

  it('filters by item type and tag tokens', () => {
    const results = getSearchResults([
      { ...baseItem, id: 'image-1', type: 'image', tags: ['castle', 'stone'], src: 'C:/refs/gate.png' },
      { ...baseItem, id: 'image-2', type: 'image', tags: ['forest'], src: 'C:/refs/tree.png' },
      { ...baseItem, id: 'note-1', type: 'sticky', tags: ['castle'], meta: { content: 'Gate notes' } },
    ], 'type:image tag:castle')

    expect(results.map((result) => result.item.id)).toEqual(['image-1'])
    expect(results[0].detail).toContain('tags: #castle #stone')
    expect(resultBadgeLabel(results[0])).toBe('2 tags')
  })

  it('filters by state and asset tokens', () => {
    const results = getSearchResults([
      { ...baseItem, id: 'linked-hidden', visible: false, link: 'https://example.com' },
      { ...baseItem, id: 'linked-visible', link: 'https://example.com' },
      { ...baseItem, id: 'hidden-no-link', visible: false },
    ], 'is:hidden has:link')

    expect(results.map((result) => result.item.id)).toEqual(['linked-hidden'])
  })

  it('groups index results by relics, inscriptions, and sigils', () => {
    const results = getSearchResults([
      { ...baseItem, id: 'image-1', type: 'image', tags: ['castle'], src: 'C:/refs/gate.png' },
      { ...baseItem, id: 'note-1', type: 'sticky', tags: [], meta: { content: 'Gate notes' } },
      { ...baseItem, id: 'memory-1', type: 'audio', tags: ['interview'], src: 'C:/audio/interview.mp3' },
    ], 'gate')

    const groups = groupSearchResults(results)

    expect(groups.map((group) => group.id)).toEqual(['relics', 'inscriptions', 'code', 'sigils', 'threads'])
    expect(groups.find((group) => group.id === 'relics')?.results.map((result) => result.id)).toEqual(['image-1'])
    expect(groups.find((group) => group.id === 'inscriptions')?.results.map((result) => result.id)).toEqual(['note-1'])
    expect(groups.find((group) => group.id === 'sigils')?.results.map((result) => result.id)).toEqual(['image-1'])
  })

  it('finds thread labels and groups them as threads', () => {
    const items: CanvasItem[] = [
      { ...baseItem, id: 'image-1', type: 'image', src: 'C:/refs/gate.png' },
      { ...baseItem, id: 'note-1', type: 'sticky', meta: { content: 'Gate notes' } },
    ]
    const results = getIndexResults(items, [baseConnection], 'source')
    const groups = groupSearchResults(results)

    expect(results.map((result) => result.id)).toContain('thread-1')
    expect(results.find((result) => result.id === 'thread-1')?.detail).toContain('Connection')
    expect(results.find((result) => result.id === 'thread-1')?.detail).toContain('label: source memory')
    expect(groups.map((group) => group.id)).toEqual(['relics', 'inscriptions', 'code', 'sigils', 'threads'])
    expect(groups.find((group) => group.id === 'threads')?.results.map((result) => result.id)).toEqual(['thread-1'])
  })

  it('indexes and filters thread meanings', () => {
    const items: CanvasItem[] = [
      { ...baseItem, id: 'image-1', type: 'image', src: 'C:/refs/gate.png' },
      { ...baseItem, id: 'note-1', type: 'sticky', meta: { content: 'Gate notes' } },
    ]
    const results = getIndexResults(items, [{ ...baseConnection, label: 'old interview', meaning: 'memory' }], 'meaning:memory')

    expect(results.map((result) => result.id)).toEqual(['thread-1'])
    expect(results[0].label).toBe('old interview')
    expect(results[0].detail).toContain('meaning: Memory')
    expect(results[0].haystack).toContain('memory')
    expect(resultBadgeLabel(results[0])).toBe('memory')
  })

  it('uses thread meaning as the fallback connection label', () => {
    const items: CanvasItem[] = [
      { ...baseItem, id: 'image-1', type: 'image', src: 'C:/refs/gate.png' },
      { ...baseItem, id: 'note-1', type: 'sticky', meta: { content: 'Gate notes' } },
    ]
    const results = getIndexResults(items, [{ ...baseConnection, label: undefined, meaning: 'question' }], 'meaning:question')

    expect(results[0].label).toBe('Question connection')
    expect(results[0].detail).toContain('shape: curved')
  })

  it('filters to marked threads with has:meaning', () => {
    const items: CanvasItem[] = [
      { ...baseItem, id: 'image-1', type: 'image', src: 'C:/refs/gate.png' },
      { ...baseItem, id: 'note-1', type: 'sticky', meta: { content: 'Gate notes' } },
    ]
    const results = getIndexResults(items, [
      { ...baseConnection, id: 'thread-1', meaning: 'memory' },
      { ...baseConnection, id: 'thread-2', label: 'plain relation', meaning: undefined },
    ], 'has:meaning')

    expect(results.map((result) => result.id)).toEqual(['thread-1'])
  })

  it('searches every chamber and marks results from dormant chambers', () => {
    const boards: CanvasBoard[] = [
      {
        id: 'hall',
        name: 'Hall',
        items: [{ ...baseItem, id: 'hall-gate', type: 'image', src: 'C:/refs/gate.png' }],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      },
      {
        id: 'vault',
        name: 'Vault',
        items: [{ ...baseItem, id: 'vault-gate', type: 'sticky', meta: { content: 'gate sketches' } }],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      },
    ]

    const results = getArchiveIndexResults(boards, 'hall', 'gate')

    expect(results.map((result) => result.id)).toEqual(['hall-gate', 'vault-gate'])
    expect(results[0].chamber).toBeUndefined()
    expect(results[1].chamber).toEqual({ id: 'vault', name: 'Vault' })
    expect(results[1].detail).toContain('board: Vault')
  })

  it('caps archive results across chambers', () => {
    const manyItems = (prefix: string) => Array.from({ length: 4 }, (_, i) => ({
      ...baseItem,
      id: `${prefix}-${i}`,
      meta: { content: `gate note ${i}` },
    }))
    const boards: CanvasBoard[] = [
      { id: 'hall', name: 'Hall', items: manyItems('hall'), connections: [], viewport: { x: 0, y: 0, scale: 1 } },
      { id: 'vault', name: 'Vault', items: manyItems('vault'), connections: [], viewport: { x: 0, y: 0, scale: 1 } },
    ]

    const results = getArchiveIndexResults(boards, 'hall', 'gate', 6)

    expect(results).toHaveLength(6)
    expect(results.slice(0, 4).every((result) => result.chamber === undefined)).toBe(true)
    expect(results.slice(4).every((result) => result.chamber?.id === 'vault')).toBe(true)
  })

  it('resolves dormant-chamber thread endpoints from their own chamber', () => {
    const boards: CanvasBoard[] = [
      { id: 'hall', name: 'Hall', items: [], connections: [], viewport: { x: 0, y: 0, scale: 1 } },
      {
        id: 'vault',
        name: 'Vault',
        items: [
          { ...baseItem, id: 'image-1', type: 'image', src: 'C:/refs/gate.png' },
          { ...baseItem, id: 'note-1', type: 'sticky', meta: { content: 'Gate notes' } },
        ],
        connections: [baseConnection],
        viewport: { x: 0, y: 0, scale: 1 },
      },
    ]

    const results = getArchiveIndexResults(boards, 'hall', 'source')
    const thread = results.find((result) => result.id === 'thread-1')

    expect(thread?.chamber).toEqual({ id: 'vault', name: 'Vault' })
    expect(thread?.detail).toContain('gate.png -> Gate notes')
    expect(thread?.detail).toContain('board: Vault')
  })

  it('filters archive results by chamber token', () => {
    const boards: CanvasBoard[] = [
      {
        id: 'hall',
        name: 'Hall',
        items: [{ ...baseItem, id: 'hall-gate', type: 'image', src: 'C:/refs/gate.png' }],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      },
      {
        id: 'vault',
        name: 'Memory Vault',
        items: [
          { ...baseItem, id: 'vault-gate', type: 'sticky', meta: { content: 'gate sketches' } },
          { ...baseItem, id: 'vault-candle', type: 'sticky', meta: { content: 'candle notes' } },
        ],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      },
    ]

    const results = getArchiveIndexResults(boards, 'hall', 'chamber:vault gate')

    expect(results.map((result) => result.id)).toEqual(['vault-gate'])
    expect(results[0].chamber).toEqual({ id: 'vault', name: 'Memory Vault' })
  })

  it('supports chamber name tokens as standalone archive filters', () => {
    const boards: CanvasBoard[] = [
      {
        id: 'hall',
        name: 'Hall',
        items: [{ ...baseItem, id: 'hall-gate', type: 'image', src: 'C:/refs/gate.png' }],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      },
      {
        id: 'memory-vault',
        name: 'Memory Vault',
        items: [{ ...baseItem, id: 'vault-note', type: 'sticky', meta: { content: 'quiet note' } }],
        connections: [],
        viewport: { x: 0, y: 0, scale: 1 },
      },
    ]

    const results = getArchiveIndexResults(boards, 'hall', 'chamber:memory-vault')

    expect(results.map((result) => result.id)).toEqual(['vault-note'])
    expect(results[0].detail).toContain('board: Memory Vault')
  })

  it('computes a focus point between thread endpoints', () => {
    const point = threadFocusPoint(
      { ...baseItem, id: 'image-1', x: 10, y: 20, width: 100, height: 80 },
      { ...baseItem, id: 'note-1', x: 310, y: 220, width: 50, height: 40 },
    )

    expect(point).toEqual({ x: 197.5, y: 150 })
  })

  it('finds the first connection related to an item result', () => {
    const threads = [
      { ...baseConnection, id: 'unrelated', fromId: 'other-1', toId: 'other-2' },
      { ...baseConnection, id: 'related', fromId: 'image-1', toId: 'note-1' },
      { ...baseConnection, id: 'also-related', fromId: 'memory-1', toId: 'image-1' },
    ]

    expect(firstRelatedThread('image-1', threads)?.id).toBe('related')
    expect(firstRelatedThread('missing', threads)).toBeNull()
  })

  it('wraps index navigation in both directions', () => {
    expect(nextSearchResultIndex(0, 3, 1)).toBe(1)
    expect(nextSearchResultIndex(2, 3, 1)).toBe(0)
    expect(nextSearchResultIndex(0, 3, -1)).toBe(2)
    expect(nextSearchResultIndex(-1, 3, 1)).toBe(0)
    expect(nextSearchResultIndex(0, 0, 1)).toBe(-1)
  })

  it('maps index keyboard input to navigation actions', () => {
    expect(indexKeyAction('Escape')).toEqual({ type: 'close' })
    expect(indexKeyAction('ArrowDown')).toEqual({ type: 'step', direction: 1 })
    expect(indexKeyAction('ArrowUp')).toEqual({ type: 'step', direction: -1 })
    expect(indexKeyAction('Enter')).toEqual({ type: 'focus', keepOpen: false })
    expect(indexKeyAction('Enter', true)).toEqual({ type: 'focus', keepOpen: true })
    expect(indexKeyAction('Tab')).toEqual({ type: 'none' })
  })
})
