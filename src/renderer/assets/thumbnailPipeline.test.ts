// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAssetMetadataForTest, getAssetMetadata, recordAssetMetadata } from './assetMetadata'
import { ensureThumbnail } from './thumbnailPipeline'

const invoke = vi.fn()

beforeEach(() => {
  clearAssetMetadataForTest()
  invoke.mockReset()
  ;(window as unknown as { ipc: unknown }).ipc = { invoke }
})

describe('ensureThumbnail', () => {
  it('records a cached thumbnail without generating', async () => {
    invoke.mockResolvedValueOnce({ exists: true, size: 10, mtimeMs: 5, thumbnailPath: 'C:/cache/t.png' })
    const generate = vi.fn()

    await ensureThumbnail('C:/a.png', generate)

    expect(generate).not.toHaveBeenCalled()
    expect(getAssetMetadata('C:/a.png')).toMatchObject({ exists: true, thumbnailPath: 'C:/cache/t.png' })
  })

  it('records missing sources without generating', async () => {
    invoke.mockResolvedValueOnce({ exists: false, thumbnailPath: null })

    await ensureThumbnail('C:/gone.png', vi.fn())

    expect(getAssetMetadata('C:/gone.png')).toMatchObject({ exists: false, thumbnailPath: null })
  })

  it('generates and caches when no thumbnail exists', async () => {
    invoke
      .mockResolvedValueOnce({ exists: true, size: 10, mtimeMs: 5, thumbnailPath: null })
      .mockResolvedValueOnce({ thumbnailPath: 'C:/cache/new.png' })
    const generate = vi.fn().mockResolvedValue('data:image/png;base64,abc')

    await ensureThumbnail('C:/a.png', generate)

    expect(generate).toHaveBeenCalledWith('C:/a.png')
    expect(invoke).toHaveBeenCalledWith('assets:cacheThumbnail', { path: 'C:/a.png', imageData: 'data:image/png;base64,abc' })
    expect(getAssetMetadata('C:/a.png')?.thumbnailPath).toBe('C:/cache/new.png')
  })

  it('records a null thumbnail when generation fails so it does not retry forever', async () => {
    invoke.mockResolvedValueOnce({ exists: true, size: 10, mtimeMs: 5, thumbnailPath: null })
    const generate = vi.fn().mockRejectedValue(new Error('boom'))

    await ensureThumbnail('C:/bad.png', generate)

    expect(getAssetMetadata('C:/bad.png')?.thumbnailPath).toBeNull()
    await ensureThumbnail('C:/bad.png', generate)
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('dedupes concurrent requests for the same src', async () => {
    let resolveLookup: (value: unknown) => void = () => {}
    invoke.mockReturnValueOnce(new Promise((resolve) => { resolveLookup = resolve }))

    const first = ensureThumbnail('C:/a.png', vi.fn())
    const second = ensureThumbnail('C:/a.png', vi.fn())
    expect(invoke).toHaveBeenCalledTimes(1)

    resolveLookup({ exists: true, size: 1, mtimeMs: 1, thumbnailPath: 'C:/cache/t.png' })
    await Promise.all([first, second])
  })

  it('skips url-like srcs and already-resolved records', async () => {
    await ensureThumbnail('https://example.com/x.png', vi.fn())
    recordAssetMetadata({ src: 'C:/done.png', exists: true, thumbnailPath: 'C:/cache/done.png' })
    await ensureThumbnail('C:/done.png', vi.fn())
    expect(invoke).not.toHaveBeenCalled()
  })
})
