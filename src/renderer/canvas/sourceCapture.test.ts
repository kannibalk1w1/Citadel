import { describe, expect, it } from 'vitest'
import { createSourceCapture, imageRegionFromPercent, imageRegionPercent, sourceCaptureConnection, sourceCaptureReference } from './sourceCapture'

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
})
