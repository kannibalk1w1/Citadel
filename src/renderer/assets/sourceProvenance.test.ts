import { describe, expect, it } from 'vitest'
import type { CanvasBoard, CanvasItem } from '../../types'
import { buildSourceChangeIndex, fingerprintFromProbe, sourceFingerprint, sourcePathFor, withSourceFingerprint } from './sourceProvenance'

const item = (id: string, src: string, meta?: Record<string, unknown>): CanvasItem => ({
  id, type: 'image', x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 0,
  locked: false, visible: true, opacity: 1, tags: [], src, meta,
})

const board = (items: CanvasItem[]): CanvasBoard => ({ id: 'board-1', name: 'Board', items, connections: [], viewport: { x: 0, y: 0, scale: 1 } })

describe('source provenance', () => {
  it('persists only a valid local source fingerprint', () => {
    const fingerprint = fingerprintFromProbe({ exists: true, size: 42, mtimeMs: 1000 })
    expect(fingerprint).toEqual({ size: 42, mtimeMs: 1000 })
    expect(sourceFingerprint(item('a', '/refs/a.png', withSourceFingerprint({}, fingerprint)))).toEqual(fingerprint)
    expect(fingerprintFromProbe({ exists: false, size: 42, mtimeMs: 1000 })).toBeUndefined()
  })

  it('reports changed, missing, untracked, and reused sources once each', () => {
    const baseline = withSourceFingerprint({}, { size: 10, mtimeMs: 100 })
    const index = buildSourceChangeIndex([board([
      item('changed-a', '/refs/changed.png', baseline),
      item('changed-b', '/refs/changed.png', baseline),
      item('missing', '/refs/missing.png', baseline),
      item('old', '/refs/old.png'),
    ])], {
      '/refs/changed.png': { exists: true, size: 12, mtimeMs: 120 },
      '/refs/missing.png': { exists: false },
      '/refs/old.png': { exists: true, size: 5, mtimeMs: 50 },
    })

    expect(index.entries.map((entry) => [entry.src, entry.status, entry.itemIds.length])).toEqual([
      ['/refs/changed.png', 'changed', 2],
      ['/refs/missing.png', 'missing', 1],
      ['/refs/old.png', 'untracked', 1],
    ])
    expect(index.summary).toMatchObject({ changed: 1, missing: 1, untracked: 1, unchanged: 0 })
  })

  it('checks a PDF against its original file rather than its generated page image', () => {
    const pdfPreview = item('pdf', '/cache/report-page-1.png', withSourceFingerprint({ sourcePdf: '/refs/report.pdf' }, { size: 40, mtimeMs: 10 }))
    expect(sourcePathFor(pdfPreview)).toBe('/refs/report.pdf')
    expect(buildSourceChangeIndex([board([pdfPreview])], {
      '/refs/report.pdf': { exists: true, size: 40, mtimeMs: 10 },
    }).summary).toMatchObject({ unchanged: 1 })
  })
})
