import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasBoard } from '../../types'
import { installMediaPreviewProfileHarness, type ProfileWindow } from './mediaPreviewProfileHarness'

// The harness owns this shape; the test used to keep a divergent copy of it.
const windowLike = (search = ''): ProfileWindow => ({
  location: { search, hash: '' },
} as unknown as ProfileWindow)

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
    expect(target.__citadelLargeChamber).toBeUndefined()
  })

  it('mounts the large-chamber fixture board when active', () => {
    const target = windowLike('?profile=media-preview')
    const setProfileBoard = vi.fn()

    installMediaPreviewProfileHarness({
      window: target,
      isDev: true,
      now: () => 1,
      ipc: { invoke: vi.fn() },
      setProfileBoard,
      wait: vi.fn(),
    })

    const result = target.__citadelLargeChamber!.mount({ itemCount: 50, columns: 10 })
    expect(result.itemCount).toBe(50)
    const board = setProfileBoard.mock.calls[0][0] as CanvasBoard
    expect(board.items.length).toBe(50)
    expect(board.id).toBe(result.boardId)
  })

  it('runs a cold and warm preview-cache sweep when active', async () => {
    const target = windowLike('?profile=media-preview')
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
