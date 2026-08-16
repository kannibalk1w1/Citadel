import { afterEach, describe, expect, it } from 'vitest'
import { chooseSourceCaptureRegion, useSourceCaptureRegionStore } from './sourceCaptureRegionStore'

afterEach(() => useSourceCaptureRegionStore.getState().cancel())

describe('source capture region selection', () => {
  it('hands a completed image region back to the capture flow', async () => {
    const choice = chooseSourceCaptureRegion('image-1')
    expect(useSourceCaptureRegionStore.getState().request?.sourceItemId).toBe('image-1')

    useSourceCaptureRegionStore.getState().complete({ x: 0.1, y: 0.2, width: 0.6, height: 0.4 })

    await expect(choice).resolves.toEqual({ x: 0.1, y: 0.2, width: 0.6, height: 0.4 })
    expect(useSourceCaptureRegionStore.getState().request).toBeNull()
  })

  it('lets a person skip a region without cancelling the capture', async () => {
    const choice = chooseSourceCaptureRegion('image-1')
    useSourceCaptureRegionStore.getState().skip()

    await expect(choice).resolves.toBeUndefined()
  })
})
