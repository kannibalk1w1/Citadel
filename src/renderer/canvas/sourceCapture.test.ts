import { describe, expect, it } from 'vitest'
import type { CanvasBoard, CanvasItem } from '../../types'
import {
  brokenSourceCaptures,
  createSourceCapture,
  imageRegionFromPercent,
  imageRegionPercent,
  sourceCaptureConnection,
  sourceCaptureHealth,
  sourceCaptureListModel,
  sourceCaptureReattachPatch,
  sourceCaptureReference,
  sourceCaptureRegionPatch,
  sourceCapturesForItem,
} from './sourceCapture'

function boardOf(id: string, name: string, items: CanvasItem[]): CanvasBoard {
  return { id, name, items, connections: [], viewport: { x: 0, y: 0, scale: 1 } }
}

function imageItem(id: string): CanvasItem {
  return {
    id, type: 'image', x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 1,
    locked: false, visible: true, opacity: 1, tags: [], src: `/refs/${id}.png`,
  }
}

describe('source captures', () => {
  it('keeps both a human-readable source and the item it came from', () => {
    const capture = createSourceCapture('Orange is the dominant value.', {
      reference: 'https://example.com/study', locator: 'Figure 2', sourceItemId: 'image-1',
    }, { x: 20, y: 30 }, 'capture-1')

    expect(sourceCaptureReference(capture)).toEqual({
      reference: 'https://example.com/study', locator: 'Figure 2', sourceItemId: 'image-1',
    })
    expect(sourceCaptureConnection(capture.id, 'image-1', '#73a8db', 'connection-1')).toMatchObject({
      fromId: 'capture-1', toId: 'image-1', meaning: 'source',
    })
  })

  it('normalizes an optional image region from percentage coordinates', () => {
    const region = imageRegionFromPercent('10, 20, 60, 40')
    expect(region).toEqual({ x: 0.1, y: 0.2, width: 0.6, height: 0.4 })
    expect(imageRegionPercent(region!)).toBe('10%, 20%, 60%, 40%')
    expect(imageRegionFromPercent('left, top')).toBeUndefined()
  })

  it('creates a history-ready patch when an image region is corrected', () => {
    const capture = createSourceCapture('Orange is the dominant value.', {
      reference: 'https://example.com/study', sourceItemId: 'image-1', region: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 },
    }, { x: 20, y: 30 }, 'capture-1')

    const patch = sourceCaptureRegionPatch(capture, { x: 0.7, y: 0.8, width: 0.5, height: 0.4 })

    expect(patch?.before).toEqual({ id: 'capture-1', meta: capture.meta })
    expect(sourceCaptureReference({ ...capture, meta: patch!.after.meta })?.region).toEqual({ x: 0.7, y: 0.8, width: 0.30000000000000004, height: 0.19999999999999996 })
  })

  it('lists captures for a source image newest first', () => {
    const older = createSourceCapture('Older note', { reference: '', sourceItemId: 'image-1' }, { x: 0, y: 0 }, 'older')
    const newer = createSourceCapture('Newer note', { reference: '', sourceItemId: 'image-1' }, { x: 0, y: 0 }, 'newer')
    const other = createSourceCapture('Other note', { reference: '', sourceItemId: 'image-2' }, { x: 0, y: 0 }, 'other')
    older.meta!.capturedAt = 100
    newer.meta!.capturedAt = 200

    expect(sourceCapturesForItem([older, other, newer], 'image-1').map((capture) => capture.id)).toEqual(['newer', 'older'])
  })
})

describe('the capture list on a source image', () => {
  const captures = [
    createSourceCapture('Warm orange carries the focal value.', { reference: 'https://example.com/a', locator: 'Figure 2', sourceItemId: 'image-1' }, { x: 0, y: 0 }, 'warm'),
    createSourceCapture('Cool shadow edge on the left.', { reference: 'https://example.com/b', locator: 'Page 14', sourceItemId: 'image-1' }, { x: 0, y: 0 }, 'cool'),
  ]

  it('filters on the note text, the location, and the reference', () => {
    expect(sourceCaptureListModel(captures, 'orange').rows.map((c) => c.id)).toEqual(['warm'])
    expect(sourceCaptureListModel(captures, 'page 14').rows.map((c) => c.id)).toEqual(['cool'])
    expect(sourceCaptureListModel(captures, 'example.com').rows).toHaveLength(2)
  })

  it('requires every term, so two words narrow rather than widen', () => {
    expect(sourceCaptureListModel(captures, 'orange figure').rows.map((c) => c.id)).toEqual(['warm'])
    expect(sourceCaptureListModel(captures, 'orange page').matched).toBe(0)
  })

  it('leaves a short list plain and reports what a long one holds back', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      createSourceCapture(`Note ${index}`, { reference: '', sourceItemId: 'image-1' }, { x: 0, y: 0 }, `n${index}`))

    expect(sourceCaptureListModel(captures).showFilter).toBe(false)
    const long = sourceCaptureListModel(many)
    expect(long.showFilter).toBe(true)
    expect(long.compact).toBe(true)
    expect(long.rows).toHaveLength(12)
    expect(long.hidden).toBe(8)
    expect(sourceCaptureListModel(many, 'Note 1').hidden).toBe(0)
  })
})

describe('capture source health', () => {
  const capture = createSourceCapture('A note worth keeping.', {
    reference: 'https://example.com/study', locator: 'Figure 2', sourceItemId: 'image-1',
    region: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 },
  }, { x: 0, y: 0 }, 'capture-1')

  it('finds a source that moved to another chamber', () => {
    const boards = [boardOf('b1', 'Studies', [capture]), boardOf('b2', 'Archive', [imageItem('image-1')])]

    expect(sourceCaptureHealth(capture, boards, 'b1')).toMatchObject({
      state: 'linked', boardId: 'b2', boardName: 'Archive', sameBoard: false,
    })
  })

  it('reports a deleted source rather than silently doing nothing', () => {
    const boards = [boardOf('b1', 'Studies', [capture])]

    expect(sourceCaptureHealth(capture, boards, 'b1')).toEqual({ state: 'broken', sourceItemId: 'image-1' })
    expect(brokenSourceCaptures(boards).map((entry) => entry.capture.id)).toEqual(['capture-1'])
  })

  it('calls a capture written without a source unlinked, not broken', () => {
    const loose = createSourceCapture('Loose thought.', { reference: '' }, { x: 0, y: 0 }, 'loose')

    expect(sourceCaptureHealth(loose, [boardOf('b1', 'Studies', [loose])], 'b1')).toEqual({ state: 'unlinked' })
    expect(brokenSourceCaptures([boardOf('b1', 'Studies', [loose])])).toEqual([])
  })

  it('reattaches without costing the note, reference, location, or region', () => {
    const patch = sourceCaptureReattachPatch(capture, 'image-2')
    const reattached = { ...capture, meta: patch!.after.meta }

    expect(sourceCaptureReference(reattached)).toEqual({
      reference: 'https://example.com/study', locator: 'Figure 2', sourceItemId: 'image-2',
      region: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 },
    })
    expect(reattached.meta!.content).toBe('A note worth keeping.')
    expect(patch!.before.meta).toEqual(capture.meta)
  })

  it('drops the link entirely when a capture is kept as a standalone note', () => {
    const patch = sourceCaptureReattachPatch(capture, null)
    const unlinked = { ...capture, meta: patch!.after.meta }

    expect(sourceCaptureReference(unlinked)?.sourceItemId).toBeUndefined()
    expect(sourceCaptureReference(unlinked)?.locator).toBe('Figure 2')
    expect(sourceCaptureReattachPatch(unlinked, null)).toBeNull()
  })
})
