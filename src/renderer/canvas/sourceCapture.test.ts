import { describe, expect, it } from 'vitest'
import { createSourceCapture, sourceCaptureConnection, sourceCaptureReference } from './sourceCapture'

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
})
