import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAssetMetadataForTest,
  getAssetMetadata,
  isLocalAssetSrc,
  recordAssetMetadata,
  subscribeAssetMetadata,
} from './assetMetadata'

beforeEach(() => clearAssetMetadataForTest())

describe('isLocalAssetSrc', () => {
  it('accepts filesystem paths and rejects url-like and empty srcs', () => {
    expect(isLocalAssetSrc('C:\\archive\\relic.png')).toBe(true)
    expect(isLocalAssetSrc('https://example.com/x.png')).toBe(false)
    expect(isLocalAssetSrc('data:image/png;base64,abc')).toBe(false)
    expect(isLocalAssetSrc('local:///c/archive/relic.png')).toBe(false)
    expect(isLocalAssetSrc(undefined)).toBe(false)
    expect(isLocalAssetSrc('')).toBe(false)
  })
})

describe('asset metadata records', () => {
  it('stores and merges records, notifying subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeAssetMetadata(listener)

    recordAssetMetadata({ src: 'C:/a.png', exists: true, size: 10 })
    recordAssetMetadata({ src: 'C:/a.png', exists: true, thumbnailPath: 'C:/cache/t.png' })

    const record = getAssetMetadata('C:/a.png')
    expect(record?.size).toBe(10)
    expect(record?.thumbnailPath).toBe('C:/cache/t.png')
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('ignores url-like srcs', () => {
    recordAssetMetadata({ src: 'https://example.com/x.png', exists: true })
    expect(getAssetMetadata('https://example.com/x.png')).toBeUndefined()
  })
})
