import { describe, expect, it } from 'vitest'
import type { CanvasBoard } from '../../types'
import { buildAssetHealthIndex } from './assetHealth'

const board = (id: string, items: CanvasBoard['items']): CanvasBoard => ({
  id,
  name: id,
  items,
  connections: [],
  viewport: { x: 0, y: 0, scale: 1 },
})

describe('assetHealth', () => {
  it('groups local asset references and summarizes availability', () => {
    const health = buildAssetHealthIndex([
      board('hall', [
        { id: 'a', type: 'image', src: 'C:/refs/castle.png', x: 0, y: 0, width: 100, height: 80, rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [] },
        { id: 'b', type: 'image', src: 'C:/refs/castle.png', x: 120, y: 0, width: 100, height: 80, rotation: 0, zIndex: 2, locked: false, visible: true, opacity: 1, tags: [] },
        { id: 'remote', type: 'image', src: 'https://example.com/remote.png', x: 0, y: 120, width: 100, height: 80, rotation: 0, zIndex: 3, locked: false, visible: true, opacity: 1, tags: [] },
      ]),
      board('vault', [
        { id: 'c', type: 'audio', src: 'C:/refs/interview.mp3', x: 0, y: 0, width: 100, height: 80, rotation: 0, zIndex: 4, locked: false, visible: true, opacity: 1, tags: [] },
      ]),
    ], {
      'C:/refs/castle.png': true,
      'C:/refs/interview.mp3': false,
    })

    expect(health.summary).toEqual({ total: 2, available: 1, missing: 1, unchecked: 0 })
    expect(health.missingPaths).toEqual(['C:/refs/interview.mp3'])
    expect(health.entries[0]).toMatchObject({
      src: 'C:/refs/castle.png',
      status: 'available',
      itemIds: ['a', 'b'],
      boardIds: ['hall'],
    })
  })

  it('marks paths as unchecked when no status is known', () => {
    const health = buildAssetHealthIndex([
      board('hall', [
        { id: 'a', type: 'image', src: 'C:/refs/castle.png', x: 0, y: 0, width: 100, height: 80, rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [] },
      ]),
    ])

    expect(health.summary).toEqual({ total: 1, available: 0, missing: 0, unchecked: 1 })
    expect(health.entries[0].status).toBe('unchecked')
  })
})
