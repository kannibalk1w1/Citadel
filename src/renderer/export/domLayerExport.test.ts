import { describe, expect, it, vi } from 'vitest'
import type { CanvasItem, ItemType, Viewport } from '../../types'
import { hasDOMLayerItems, loadPosters, paintDOMLayerForExport, type PosterImage } from './domLayerExport'

const viewport: Viewport = { x: 0, y: 0, scale: 1 }

function item(type: ItemType, over: Partial<CanvasItem> = {}): CanvasItem {
  return {
    id: `${type}-1`, type, x: 0, y: 0, width: 320, height: 200,
    rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [],
    ...over,
  }
}

function recordingContext() {
  const calls: { op: string; args: unknown[] }[] = []
  const state: Record<string, unknown> = {}
  return new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 7 })
      if (prop === 'calls') return calls
      if (prop in state) return state[prop]
      return (...args: unknown[]) => { calls.push({ op: prop, args }) }
    },
    set(_t, prop: string, value) { state[prop] = value; return true },
  }) as unknown as CanvasRenderingContext2D & { calls: { op: string; args: unknown[] }[] }
}

const drawnText = (ctx: { calls: { op: string; args: unknown[] }[] }): string[] =>
  ctx.calls.filter((c) => c.op === 'fillText').map((c) => String(c.args[0]))

const poster = { width: 100, height: 100 } as unknown as PosterImage

describe('hasDOMLayerItems', () => {
  it('is true for anything the stage capture would have missed', () => {
    for (const type of ['code', 'video', 'youtube', 'audio', 'model3d'] as ItemType[]) {
      expect(hasDOMLayerItems([item(type, { src: 'a' })])).toBe(true)
    }
  })

  it('is false for a board of Konva items only', () => {
    expect(hasDOMLayerItems([item('image', { src: 'a.png' }), item('sticky'), item('text')])).toBe(false)
  })

  it('is false for an empty board', () => {
    expect(hasDOMLayerItems([])).toBe(false)
  })

  it('ignores hidden DOM items, which have nothing to draw', () => {
    expect(hasDOMLayerItems([item('video', { src: 'a.mp4', visible: false })])).toBe(false)
  })
})

describe('loadPosters', () => {
  it('keeps the images that decoded and drops the ones that did not', async () => {
    const posters = await loadPosters(['ok.png', 'broken.png'], async (path) => (path === 'ok.png' ? poster : null))

    expect(posters.get('ok.png')).toBe(poster)
    expect(posters.has('broken.png')).toBe(false)
  })

  it('does no work when nothing needs decoding', async () => {
    const load = vi.fn()
    expect((await loadPosters([], load)).size).toBe(0)
    expect(load).not.toHaveBeenCalled()
  })
})

describe('paintDOMLayerForExport', () => {
  it('paints code cards and media in one pass', async () => {
    const ctx = recordingContext()
    const counts = await paintDOMLayerForExport(ctx, [
      item('code', { id: 'c', meta: { language: 'python', code: 'def main(): pass' } }),
      item('video', { id: 'v', y: 300, src: 'clip.mp4' }),
      item('image', { id: 'i', y: 600, src: 'a.png' }),
    ], viewport, 1, { thumbnailFor: () => null, loadPoster: async () => null })

    expect(counts).toEqual({ codeCards: 1, media: 1 })
    const text = drawnText(ctx).join(' ')
    expect(text).toContain('PYTHON')
    expect(text).toContain('VIDEO')
  })

  it('decodes each cached poster once and draws it', async () => {
    const ctx = recordingContext()
    const loadPoster = vi.fn(async () => poster)

    await paintDOMLayerForExport(ctx, [
      item('video', { id: 'v1', src: 'clip.mp4' }),
      item('video', { id: 'v2', y: 300, src: 'clip.mp4' }),
    ], viewport, 1, { thumbnailFor: () => 'thumb.png', loadPoster })

    expect(loadPoster).toHaveBeenCalledTimes(1)
    expect(ctx.calls.filter((c) => c.op === 'drawImage')).toHaveLength(2)
  })

  // A stale or deleted cache entry must degrade to the placeholder, not take
  // the whole export down with it.
  it('falls back to placeholders when a poster fails to decode', async () => {
    const ctx = recordingContext()

    const counts = await paintDOMLayerForExport(ctx, [item('video', { src: 'clip.mp4' })], viewport, 1, {
      thumbnailFor: () => 'thumb.png',
      loadPoster: async () => null,
    })

    expect(counts.media).toBe(1)
    expect(ctx.calls.some((c) => c.op === 'drawImage')).toBe(false)
    expect(drawnText(ctx)).toContain('VIDEO')
  })

  it('asks for no posters for audio or YouTube, which have no still to take', async () => {
    const loadPoster = vi.fn(async () => poster)

    await paintDOMLayerForExport(recordingContext(), [
      item('audio', { id: 'a', src: 'take.wav' }),
      item('youtube', { id: 'y', y: 300, src: 'https://youtu.be/abc123XYZ' }),
    ], viewport, 1, { thumbnailFor: () => 'thumb.png', loadPoster })

    expect(loadPoster).not.toHaveBeenCalled()
  })

  it('draws nothing for a board of Konva items only', async () => {
    const ctx = recordingContext()
    const counts = await paintDOMLayerForExport(ctx, [item('image', { src: 'a.png' })], viewport, 1, {
      thumbnailFor: () => null,
      loadPoster: async () => null,
    })

    expect(counts).toEqual({ codeCards: 0, media: 0 })
    expect(ctx.calls).toEqual([])
  })
})
