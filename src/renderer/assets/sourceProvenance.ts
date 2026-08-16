import type { CanvasBoard, CanvasItem } from '../../types'
import { isLocalAssetSrc } from './assetMetadata'

export type SourceFingerprint = {
  size: number
  mtimeMs: number
}

export type SourceProbe = {
  exists: boolean
  size?: number
  mtimeMs?: number
}

export type SourceChangeStatus = 'unchanged' | 'changed' | 'missing' | 'untracked'

export type SourceChangeEntry = {
  src: string
  filename: string
  status: SourceChangeStatus
  itemIds: string[]
  boardIds: string[]
  current?: SourceFingerprint
}

export type SourceChangeIndex = {
  entries: SourceChangeEntry[]
  summary: Record<SourceChangeStatus, number>
}

const FINGERPRINT_KEY = 'sourceFingerprint'

/** PDF items render from a cached page image but their provenance is the PDF. */
export function sourcePathFor(item: CanvasItem): string | undefined {
  const pdfSource = item.meta?.sourcePdf
  if (typeof pdfSource === 'string') return pdfSource
  return item.src
}

function filename(src: string): string {
  return src.split(/[?#]/)[0].split(/[\\/]/).pop() || src
}

export function fingerprintFromProbe(probe: SourceProbe | null | undefined): SourceFingerprint | undefined {
  if (!probe?.exists || !Number.isFinite(probe.size) || !Number.isFinite(probe.mtimeMs)) return undefined
  return { size: probe.size!, mtimeMs: probe.mtimeMs! }
}

export function sourceFingerprint(item: CanvasItem): SourceFingerprint | undefined {
  const value = item.meta?.[FINGERPRINT_KEY]
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (!Number.isFinite(record.size) || !Number.isFinite(record.mtimeMs)) return undefined
  return { size: record.size as number, mtimeMs: record.mtimeMs as number }
}

export function withSourceFingerprint(meta: Record<string, unknown> | undefined, fingerprint: SourceFingerprint | undefined): Record<string, unknown> {
  if (!fingerprint) return { ...meta }
  return { ...meta, [FINGERPRINT_KEY]: fingerprint }
}

function changed(before: SourceFingerprint, after: SourceFingerprint): boolean {
  return before.size !== after.size || before.mtimeMs !== after.mtimeMs
}

/** Groups reused local sources and compares their saved import baseline to disk. */
export function buildSourceChangeIndex(boards: CanvasBoard[], probes: Record<string, SourceProbe>): SourceChangeIndex {
  const entries = new Map<string, SourceChangeEntry>()
  for (const board of boards) {
    for (const item of board.items) {
      const src = sourcePathFor(item)
      if (!isLocalAssetSrc(src)) continue
      const existing = entries.get(src)
      if (existing) {
        existing.itemIds.push(item.id)
        if (!existing.boardIds.includes(board.id)) existing.boardIds.push(board.id)
        continue
      }
      const probe = probes[src]
      const current = fingerprintFromProbe(probe)
      const baseline = sourceFingerprint(item)
      const status: SourceChangeStatus = probe && !probe.exists
        ? 'missing'
        : !baseline
          ? 'untracked'
          : current && changed(baseline, current)
            ? 'changed'
            : 'unchanged'
      entries.set(src, { src, filename: filename(src), status, itemIds: [item.id], boardIds: [board.id], current })
    }
  }

  const sorted = [...entries.values()].sort((a, b) => a.filename.localeCompare(b.filename))
  const summary: SourceChangeIndex['summary'] = { unchanged: 0, changed: 0, missing: 0, untracked: 0 }
  sorted.forEach((entry) => { summary[entry.status] += 1 })
  return { entries: sorted, summary }
}
