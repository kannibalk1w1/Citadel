import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasBoard } from '../../types'
import { installMediaPreviewProfileHarness } from './mediaPreviewProfileHarness'

type HarnessWindow = Window & {
  __citadelMediaPreviewProfile?: {
    run: (args: { gifPath: string; videoPath: string; modelPath: string; timeoutMs?: number }) => Promise<unknown>
  }
  __citadelProfileResult?: unknown
}

const windowLike = (): HarnessWindow => ({
  location: { search: '', hash: '' } as Location,
} as HarnessWindow)

describe('media preview profile harness', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('does not expose profile globals when inactive', () => {
    const target = windowLike()

    installMediaPreviewProfileHarness({
      window: target,
      isDev: true,
      now: () => 1,
      ipc: { invoke: vi.fn() },
      setProfileBoard: vi.fn(),
      wait: vi.fn(),
    })

    expect(target.__citadelMediaPreviewProfile).toBeUndefined()
    expect(target.__citadelProfileResult).toBeUndefined()
  })

  it('runs a cold and warm preview-cache sweep when active', async () => {
    const target = windowLike()
    target.location = { search: '?profile=media-preview', hash: '' } as Location
    const setProfileBoard = vi.fn()
    const wait = vi.fn().mockResolvedValue(undefined)
    const now = vi.fn()
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(180)
    const invoke = vi.fn()
      .mockResolvedValueOnce({ deleted: 0, bytes: 0 })
      .mockResolvedValueOnce({ count: 0, bytes: 0 })
      .mockResolvedValueOnce({ count: 3, bytes: 300 })
      .mockResolvedValueOnce({ count: 3, bytes: 300 })

    installMediaPreviewProfileHarness({
      window: target,
      isDev: true,
      now,
      ipc: { invoke },
      setProfileBoard,
      wait,
    })

    const result = await target.__citadelMediaPreviewProfile?.run({
      gifPath: 'C:/media/a.gif',
      videoPath: 'C:/media/b.webm',
      modelPath: 'C:/media/c.obj',
      timeoutMs: 200,
    })

    expect(invoke).toHaveBeenNthCalledWith(1, 'cache:clearUnusedPreviews', { preservePaths: [], assetPaths: [] })
    expect(invoke).toHaveBeenCalledWith('cache:previewStats')
    expect(setProfileBoard).toHaveBeenCalledWith(expect.objectContaining({
      id: 'media-preview-profile-board',
      items: expect.arrayContaining([
        expect.objectContaining({ id: 'media-preview-profile-gif', type: 'gif' }),
      ]),
    } satisfies Partial<CanvasBoard>))
    expect(wait).toHaveBeenCalled()
    expect(result).toMatchObject({
      durationMs: 80,
      cacheAfterWarm: { count: 3, bytes: 300 },
      timedOut: false,
    })
    expect(target.__citadelProfileResult).toBe(result)
  })
})
