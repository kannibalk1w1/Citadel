import { describe, expect, it } from 'vitest'
import type { CanvasBoard } from '../../types'
import { buildArchiveWorkbenchModel } from './archiveWorkbenchModel'

const item = (id: string, patch: Partial<CanvasBoard['items'][number]> = {}): CanvasBoard['items'][number] => ({
  id,
  type: 'image',
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
  ...patch,
})

const board = (id: string, items: CanvasBoard['items']): CanvasBoard => ({
  id,
  name: id === 'hall' ? 'Hall' : 'Vault',
  items,
  connections: [],
  viewport: { x: 0, y: 0, scale: 1 },
})

describe('archiveWorkbenchModel', () => {
  it('finds uncategorized local relics and suggests sigils', () => {
    const model = buildArchiveWorkbenchModel([
      board('hall', [
        item('untagged', { src: 'C:/refs/field-recording.wav', type: 'audio' }),
        item('tagged', { src: 'C:/refs/castle.png', tags: ['architecture'] }),
        item('remote', { src: 'https://example.com/remote.png' }),
      ]),
    ])

    expect(model.uncategorizedRelics.map((relic) => relic.itemId)).toEqual(['untagged'])
    expect(model.uncategorizedRelics[0]).toMatchObject({
      chamberId: 'hall',
      chamberName: 'Hall',
      filename: 'field-recording.wav',
      type: 'audio',
      suggestedSigils: ['audio', 'field', 'recording'],
    })
  })

  it('includes missing relics from the asset health index', () => {
    const model = buildArchiveWorkbenchModel([
      board('hall', [item('missing', { src: 'C:/refs/lost-map.png' })]),
      board('vault', [item('copy', { src: 'C:/refs/lost-map.png', tags: ['map'] })]),
    ], { 'C:/refs/lost-map.png': false })

    expect(model.missingRelics).toEqual([{
      src: 'C:/refs/lost-map.png',
      filename: 'lost-map.png',
      itemIds: ['missing', 'copy'],
      chamberIds: ['hall', 'vault'],
      types: ['image'],
    }])
    expect(model.summary).toMatchObject({ uncategorized: 1, missingAssets: 1 })
  })

  it('keeps inscribed notes out of uncategorized relic review', () => {
    const model = buildArchiveWorkbenchModel([
      board('hall', [
        item('captioned', { src: 'C:/refs/page.png', meta: { content: 'already described' } }),
      ]),
    ])

    expect(model.uncategorizedRelics).toEqual([])
  })
})
