import { describe, expect, it } from 'vitest'
import {
  createMediaPreviewProfileBoard,
  isMediaPreviewProfileEnabled,
  summarizeMediaPreviewProfile,
} from './mediaPreviewProfile'

describe('media preview profile model', () => {
  it('only enables the harness in dev mode with an explicit profile trigger', () => {
    expect(isMediaPreviewProfileEnabled({ search: '?profile=media-preview', hash: '' }, true)).toBe(true)
    expect(isMediaPreviewProfileEnabled({ search: '', hash: '#profile-media-preview' }, true)).toBe(true)
    expect(isMediaPreviewProfileEnabled({ search: '?profile=media-preview', hash: '' }, false)).toBe(false)
    expect(isMediaPreviewProfileEnabled({ search: '', hash: '' }, true)).toBe(false)
  })

  it('creates a temporary far-zoom chamber with local GIF, video, and 3D relics', () => {
    const board = createMediaPreviewProfileBoard({
      gifPath: 'C:/media/a.gif',
      videoPath: 'C:/media/b.webm',
      modelPath: 'C:/media/c.obj',
    })

    expect(board.id).toBe('media-preview-profile-board')
    expect(board.name).toBe('Media Preview Profile')
    expect(board.viewport.scale).toBe(0.5)
    expect(board.items.map((item) => [item.id, item.type, item.src])).toEqual([
      ['media-preview-profile-gif', 'gif', 'C:/media/a.gif'],
      ['media-preview-profile-video', 'video', 'C:/media/b.webm'],
      ['media-preview-profile-model', 'model3d', 'C:/media/c.obj'],
    ])
    expect(board.meta).toMatchObject({ profile: 'media-preview' })
  })

  it('summarizes cache and chamber load observations for cold and warm passes', () => {
    const board = createMediaPreviewProfileBoard({
      gifPath: 'C:/media/a.gif',
      videoPath: 'C:/media/b.webm',
      modelPath: 'C:/media/c.obj',
    })

    const result = summarizeMediaPreviewProfile({
      board,
      assetPaths: {
        gifPath: 'C:/media/a.gif',
        videoPath: 'C:/media/b.webm',
        modelPath: 'C:/media/c.obj',
      },
      startedAt: 10,
      finishedAt: 30,
      cacheBefore: { count: 0, bytes: 0 },
      cacheAfterCold: { count: 3, bytes: 300 },
      cacheAfterWarm: { count: 3, bytes: 300 },
      previewedItemIds: ['media-preview-profile-gif', 'media-preview-profile-video', 'media-preview-profile-model'],
      timedOut: false,
    })

    expect(result.durationMs).toBe(20)
    expect(result.cacheDeltaCold).toEqual({ count: 3, bytes: 300 })
    expect(result.cacheDeltaWarm).toEqual({ count: 0, bytes: 0 })
    expect(result.chamberLoad).toMatchObject({
      totalRelics: 3,
      mountedRelics: 3,
      awakeDOMMedia: 2,
      sleepingAnimatedRelics: 0,
    })
    expect(result.mediaPreviewLoad).toMatchObject({
      previewableMountedRelics: 3,
      staticPreviewRelics: 3,
      pendingPreviewRelics: 0,
    })
    expect(result.notes).toEqual([])
  })

  it('records a note when preview generation does not finish before timeout', () => {
    const board = createMediaPreviewProfileBoard({
      gifPath: 'C:/media/a.gif',
      videoPath: 'C:/media/b.webm',
      modelPath: 'C:/media/c.obj',
    })

    const result = summarizeMediaPreviewProfile({
      board,
      assetPaths: {
        gifPath: 'C:/media/a.gif',
        videoPath: 'C:/media/b.webm',
        modelPath: 'C:/media/c.obj',
      },
      startedAt: 10,
      finishedAt: 30,
      cacheBefore: { count: 0, bytes: 0 },
      cacheAfterCold: { count: 1, bytes: 100 },
      cacheAfterWarm: { count: 1, bytes: 100 },
      previewedItemIds: ['media-preview-profile-gif'],
      timedOut: true,
    })

    expect(result.mediaPreviewLoad.pendingPreviewRelics).toBe(2)
    expect(result.notes).toEqual(['Timed out before all three media previews appeared in cache.'])
  })
})
