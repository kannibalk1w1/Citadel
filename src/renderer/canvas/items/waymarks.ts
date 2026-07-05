import type { CanvasItem } from '../../../types'

// Waymarks: labeled anchor points pinned to normalized coordinates inside an
// image relic (Alkemion's interactive-map pins, archival flavour). Stored in
// item.meta.waymarks; edits ride ITEM_STYLE with full meta before/after.

export const WAYMARK_MAX = 16

export type Waymark = {
  id: string
  u: number // 0..1 across the relic width
  v: number // 0..1 down the relic height
  label: string
}

type WaymarkPatch = {
  before: { id: string; meta: Record<string, unknown> }
  after: { id: string; meta: Record<string, unknown> }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function normalizeWaymark(value: unknown): Waymark | null {
  if (!value || typeof value !== 'object') return null
  const mark = value as Partial<Waymark>
  if (typeof mark.id !== 'string' || !mark.id) return null
  if (typeof mark.u !== 'number' || typeof mark.v !== 'number') return null
  return {
    id: mark.id,
    u: clamp01(mark.u),
    v: clamp01(mark.v),
    label: typeof mark.label === 'string' ? mark.label : '',
  }
}

export function resolveWaymarks(item: CanvasItem): Waymark[] {
  const raw = item.meta?.waymarks
  if (!Array.isArray(raw)) return []
  return raw
    .map(normalizeWaymark)
    .filter((mark): mark is Waymark => mark !== null)
    .slice(0, WAYMARK_MAX)
}

function metaPatch(item: CanvasItem, waymarks: Waymark[]): WaymarkPatch {
  return {
    before: { id: item.id, meta: { ...item.meta } },
    after: { id: item.id, meta: { ...item.meta, waymarks } },
  }
}

export function addWaymarkPatch(item: CanvasItem, mark: Waymark): WaymarkPatch | null {
  const current = resolveWaymarks(item)
  if (current.length >= WAYMARK_MAX) return null
  return metaPatch(item, [...current, mark])
}

export function removeWaymarkPatch(item: CanvasItem, id: string): WaymarkPatch | null {
  const current = resolveWaymarks(item)
  if (!current.some((mark) => mark.id === id)) return null
  return metaPatch(item, current.filter((mark) => mark.id !== id))
}

export function setWaymarkLabelPatch(item: CanvasItem, id: string, label: string): WaymarkPatch | null {
  const current = resolveWaymarks(item)
  if (!current.some((mark) => mark.id === id)) return null
  return metaPatch(item, current.map((mark) => (mark.id === id ? { ...mark, label } : mark)))
}
