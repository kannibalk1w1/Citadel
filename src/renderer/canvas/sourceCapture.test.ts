import { describe, expect, it } from 'vitest'
import { createSourceCapture, imageRegionFromPercent, imageRegionPercent, sourceCaptureConnection, sourceCaptureReference, sourceCaptureRegionPatch, sourceCapturesForItem } from './sourceCapture'

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
