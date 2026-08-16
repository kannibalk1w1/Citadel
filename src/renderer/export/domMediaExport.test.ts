import { describe, expect, it } from 'vitest'
import type { CanvasItem, ItemType, Viewport } from '../../types'
import {
  basename,
  containRect,
  domMediaExportPlan,
  fitLabel,
  isExportableDomMedia,
  mediaIdentity,
  paintDomMediaCard,
  paintDomMediaForExport,
  posterPathsForExport,
  youTubeVideoId,
} from './domMediaExport'

const viewport: Viewport = { x: 0, y: 0, scale: 1 }

function mediaItem(type: ItemType, src: string | undefined, over: Partial<CanvasItem> = {}): CanvasItem {
  return {
    id: `${type}-1`, type, x: 0, y: 0, width: 320, height: 180,
    rotation: 0, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [], src,
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
    set(_t, prop: string, value) { state[prop] = value; calls.push({ op: `set:${prop}`, args: [value] }); return true },
  }) as unknown as CanvasRenderingContext2D & { calls: { op: string; args: unknown[] }[] }
}

function drawnText(ctx: { calls: { op: string; args: unknown[] }[] }): string[] {
  return ctx.calls.filter((c) => c.op === 'fillText').map((c) => String(c.args[0]))
}

const poster = { width: 640, height: 360 } as unknown as CanvasImageSource & { width: number; height: number }

describe('isExportableDomMedia', () => {
  it('covers exactly the four DOM media types', () => {
    for (const type of ['video', 'youtube', 'audio', 'model3d'] as ItemType[]) {
      expect(isExportableDomMedia(mediaItem(type, 'a.mp4'))).toBe(true)
    }
  })

  it('leaves Konva items and code cards to their own paths', () => {
    expect(isExportableDomMedia(mediaItem('image', 'a.png'))).toBe(false)
    expect(isExportableDomMedia(mediaItem('code', undefined))).toBe(false)
  })

  it('skips a hidden item', () => {
    expect(isExportableDomMedia(mediaItem('video', 'a.mp4', { visible: false }))).toBe(false)
  })
})

describe('mediaIdentity', () => {
  it('names a local file by its basename, not its whole path', () => {
    expect(mediaIdentity(mediaItem('video', 'C:/refs/clips/run-cycle.mp4'))).toBe('run-cycle.mp4')
    expect(mediaIdentity(mediaItem('audio', '/home/me/notes/take-3.wav'))).toBe('take-3.wav')
    expect(mediaIdentity(mediaItem('model3d', 'models\\bust.glb'))).toBe('bust.glb')
  })

  it('names a YouTube item by its video id', () => {
    expect(mediaIdentity(mediaItem('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'))).toBe('youtube.com · dQw4w9WgXcQ')
  })

  it('falls back to the raw URL when no id can be parsed', () => {
    expect(mediaIdentity(mediaItem('youtube', 'https://example.com/thing'))).toBe('https://example.com/thing')
  })

  it('says so plainly when the item has no source', () => {
    expect(mediaIdentity(mediaItem('video', undefined))).toBe('Source missing')
  })
})

describe('youTubeVideoId', () => {
  it('reads the three URL shapes YouTube hands out', () => {
    expect(youTubeVideoId('https://youtu.be/abc123XYZ')).toBe('abc123XYZ')
    expect(youTubeVideoId('https://www.youtube.com/watch?v=abc123XYZ&t=30')).toBe('abc123XYZ')
    expect(youTubeVideoId('https://www.youtube.com/embed/abc123XYZ')).toBe('abc123XYZ')
  })

  it('returns nothing for a URL that is not a video', () => {
    expect(youTubeVideoId('https://www.youtube.com/')).toBeNull()
  })
})

describe('basename and fitLabel', () => {
  it('keeps a short label intact', () => {
    expect(fitLabel('clip.mp4', 400, 12)).toBe('clip.mp4')
  })

  it('trims from the front so the distinguishing tail survives', () => {
    const fitted = fitLabel('a-very-long-reference-filename.mp4', 60, 12)
    expect(fitted.startsWith('…')).toBe(true)
    expect(fitted.endsWith('.mp4')).toBe(true)
  })

  it('gives up rather than emit a lone ellipsis', () => {
    expect(fitLabel('clip.mp4', 4, 12)).toBe('')
  })

  it('handles a bare filename with no directory', () => {
    expect(basename('clip.mp4')).toBe('clip.mp4')
  })
})

describe('containRect', () => {
  it('letterboxes a wide source into a square box', () => {
    expect(containRect(200, 100, { x: 0, y: 0, width: 100, height: 100 }))
      .toEqual({ x: 0, y: 25, width: 100, height: 50 })
  })

  it('pillarboxes a tall source', () => {
    expect(containRect(100, 200, { x: 0, y: 0, width: 100, height: 100 }))
      .toEqual({ x: 25, y: 0, width: 50, height: 100 })
  })

  it('returns the box unchanged for a degenerate source', () => {
    const dst = { x: 1, y: 2, width: 10, height: 20 }
    expect(containRect(0, 0, dst)).toEqual(dst)
  })
})

describe('domMediaExportPlan', () => {
  it('places the item through the viewport transform and pixel ratio', () => {
    const plan = domMediaExportPlan(mediaItem('video', 'a.mp4', { x: 10, y: 20 }), { x: 5, y: 7, scale: 2 }, 3)!

    expect(plan.x).toBe(10 * 2 * 3 + 5 * 3)
    expect(plan.y).toBe(20 * 2 * 3 + 7 * 3)
    expect(plan.width).toBe(320 * 2 * 3)
  })

  // Only video and 3D have a preview pipeline that produces a still.
  it('takes a cached poster for video and 3D', () => {
    const lookup = () => 'thumb.png'
    expect(domMediaExportPlan(mediaItem('video', 'a.mp4'), viewport, 1, lookup)!.posterPath).toBe('thumb.png')
    expect(domMediaExportPlan(mediaItem('model3d', 'a.glb'), viewport, 1, lookup)!.posterPath).toBe('thumb.png')
  })

  it('never claims a poster for audio or YouTube', () => {
    const lookup = () => 'thumb.png'
    expect(domMediaExportPlan(mediaItem('audio', 'a.wav'), viewport, 1, lookup)!.posterPath).toBeNull()
    expect(domMediaExportPlan(mediaItem('youtube', 'https://youtu.be/abc123XYZ'), viewport, 1, lookup)!.posterPath).toBeNull()
  })

  it('has no poster before the preview pipeline has produced one', () => {
    expect(domMediaExportPlan(mediaItem('video', 'a.mp4'), viewport)!.posterPath).toBeNull()
  })

  it('returns nothing for an item with no area, or one it does not own', () => {
    expect(domMediaExportPlan(mediaItem('video', 'a.mp4', { width: 0 }), viewport)).toBeNull()
    expect(domMediaExportPlan(mediaItem('image', 'a.png'), viewport)).toBeNull()
  })
})

describe('posterPathsForExport', () => {
  it('collects each distinct poster once', () => {
    const items = [
      mediaItem('video', 'a.mp4', { id: 'v1' }),
      mediaItem('video', 'a.mp4', { id: 'v2' }),
      mediaItem('model3d', 'b.glb', { id: 'm1' }),
      mediaItem('audio', 'c.wav', { id: 'a1' }),
    ]
    const paths = posterPathsForExport(items, (src) => (src === 'a.mp4' ? 'thumb-a.png' : src === 'b.glb' ? 'thumb-b.png' : null))

    expect(paths.sort()).toEqual(['thumb-a.png', 'thumb-b.png'])
  })

  it('asks for nothing when no previews are cached', () => {
    expect(posterPathsForExport([mediaItem('video', 'a.mp4')], () => null)).toEqual([])
  })
})

describe('paintDomMediaCard', () => {
  it('labels a placeholder with the type and the filename', () => {
    const ctx = recordingContext()
    paintDomMediaCard(ctx, domMediaExportPlan(mediaItem('video', 'refs/run-cycle.mp4'), viewport)!, null)
    const text = drawnText(ctx)

    expect(text).toContain('VIDEO')
    expect(text).toContain('run-cycle.mp4')
  })

  it('labels each media type distinctly', () => {
    const badges = (['video', 'youtube', 'audio', 'model3d'] as ItemType[]).map((type) => {
      const ctx = recordingContext()
      paintDomMediaCard(ctx, domMediaExportPlan(mediaItem(type, 'a.bin'), viewport)!, null)
      return drawnText(ctx)[0]
    })

    expect(badges).toEqual(['VIDEO', 'YOUTUBE', 'AUDIO', '3D MODEL'])
  })

  it('carries the YouTube video id into the export', () => {
    const ctx = recordingContext()
    paintDomMediaCard(ctx, domMediaExportPlan(mediaItem('youtube', 'https://youtu.be/dQw4w9WgXcQ'), viewport)!, null)

    expect(drawnText(ctx).join(' ')).toContain('dQw4w9WgXcQ')
  })

  it('draws the poster when one exists, letterboxed into the card', () => {
    const ctx = recordingContext()
    paintDomMediaCard(ctx, domMediaExportPlan(mediaItem('video', 'a.mp4'), viewport, 1, () => 't.png')!, poster)

    const draw = ctx.calls.find((c) => c.op === 'drawImage')!
    expect(draw).toBeTruthy()
    // 640x360 into 320x180 is an exact fit, so it fills the card.
    expect(draw.args.slice(1)).toEqual([0, 0, 320, 180])
  })

  // A still frame of a video is not a photograph; the badge keeps the
  // distinction visible in an exported board.
  it('keeps the type badge over a poster', () => {
    const ctx = recordingContext()
    paintDomMediaCard(ctx, domMediaExportPlan(mediaItem('video', 'a.mp4'), viewport, 1, () => 't.png')!, poster)

    expect(drawnText(ctx)).toContain('VIDEO')
  })

  it('falls back to the placeholder when a poster failed to decode', () => {
    const ctx = recordingContext()
    paintDomMediaCard(ctx, domMediaExportPlan(mediaItem('video', 'a.mp4'), viewport, 1, () => 't.png')!, null)

    expect(ctx.calls.some((c) => c.op === 'drawImage')).toBe(false)
    expect(drawnText(ctx)).toContain('VIDEO')
  })

  it('confines its drawing to the item rect', () => {
    const ctx = recordingContext()
    paintDomMediaCard(ctx, domMediaExportPlan(mediaItem('audio', 'a.wav'), viewport)!, null)

    expect(ctx.calls.some((c) => c.op === 'clip')).toBe(true)
  })

  it('carries the item opacity into the export', () => {
    const ctx = recordingContext()
    paintDomMediaCard(ctx, domMediaExportPlan(mediaItem('audio', 'a.wav', { opacity: 0.5 }), viewport)!, null)

    expect(ctx.calls.some((c) => c.op === 'set:globalAlpha' && c.args[0] === 0.5)).toBe(true)
  })

  it('never draws playback controls or a progress bar', () => {
    const ctx = recordingContext()
    paintDomMediaCard(ctx, domMediaExportPlan(mediaItem('video', 'a.mp4'), viewport)!, null)

    expect(drawnText(ctx).join(' ')).not.toMatch(/play|pause|▶|■|volume/i)
  })
})

describe('paintDomMediaForExport', () => {
  it('paints every media item and reports the count', () => {
    const ctx = recordingContext()
    const painted = paintDomMediaForExport(ctx, [
      mediaItem('video', 'a.mp4', { id: 'v' }),
      mediaItem('audio', 'b.wav', { id: 'a', y: 200 }),
      mediaItem('image', 'c.png', { id: 'i', y: 400 }),
    ], viewport)

    expect(painted).toBe(2)
    expect(drawnText(ctx)).toContain('VIDEO')
    expect(drawnText(ctx)).toContain('AUDIO')
  })

  it('paints nothing for a board with no DOM media', () => {
    const ctx = recordingContext()
    expect(paintDomMediaForExport(ctx, [mediaItem('image', 'a.png')], viewport)).toBe(0)
    expect(drawnText(ctx)).toEqual([])
  })
})
