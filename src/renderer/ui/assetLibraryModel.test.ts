import { describe, expect, it } from 'vitest'
import type { CanvasBoard } from '../../types'
import { buildAssetLibrary } from './assetLibraryModel'

const board = (items: CanvasBoard['items']): CanvasBoard => ({
  id: 'board-1',
  name: 'Board 1',
  items,
  connections: [],
  viewport: { x: 0, y: 0, scale: 1 },
})

describe('assetLibraryModel', () => {
  it('groups asset-backed items by source path', () => {
    const assets = buildAssetLibrary([
      board([
        { id: 'a', type: 'image', src: 'C:/refs/castle.png', x: 0, y: 0, width: 100, height: 80, rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [] },
        { id: 'b', type: 'image', src: 'C:/refs/castle.png', x: 120, y: 0, width: 100, height: 80, rotation: 0, zIndex: 2, locked: false, visible: true, opacity: 1, tags: [] },
        { id: 'c', type: 'text', x: 0, y: 120, width: 100, height: 30, rotation: 0, zIndex: 3, locked: false, visible: true, opacity: 1, tags: [] },
      ]),
    ])

    expect(assets).toHaveLength(1)
    expect(assets[0]).toMatchObject({
      src: 'C:/refs/castle.png',
      filename: 'castle.png',
      type: 'image',
      count: 2,
      firstItemId: 'a',
      firstBoardId: 'board-1',
    })
  })

  it('sorts assets by filename', () => {
    const assets = buildAssetLibrary([
      board([
        { id: 'b', type: 'audio', src: 'C:/refs/z-tone.mp3', x: 0, y: 0, width: 100, height: 80, rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [] },
        { id: 'a', type: 'image', src: 'C:/refs/a-castle.png', x: 0, y: 0, width: 100, height: 80, rotation: 0, zIndex: 2, locked: false, visible: true, opacity: 1, tags: [] },
      ]),
    ])

    expect(assets.map((asset) => asset.filename)).toEqual(['a-castle.png', 'z-tone.mp3'])
  })
})
