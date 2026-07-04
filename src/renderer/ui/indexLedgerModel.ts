import type { CanvasBoard } from '../../types'
import { buildSearchResult, buildThreadSearchResult } from './itemSearchModel'

// The Ledger is the structured lens over the whole archive: every relic and
// thread in every chamber as one sortable, filterable table.

export type LedgerRow = {
  kind: 'relic' | 'thread'
  id: string
  chamberId: string
  chamberName: string
  label: string
  type: string
  sigils: string
  detail: string
  haystack: string
  focus: { x: number; y: number }
}

export type LedgerSortKey = 'label' | 'type' | 'chamber' | 'sigils'
export type LedgerSortDirection = 'asc' | 'desc'

export function buildLedgerRows(boards: CanvasBoard[]): LedgerRow[] {
  const rows: LedgerRow[] = []
  for (const board of boards) {
    const itemMap = new Map(board.items.map((item) => [item.id, item]))
    for (const item of board.items) {
      const result = buildSearchResult(item)
      rows.push({
        kind: 'relic',
        id: item.id,
        chamberId: board.id,
        chamberName: board.name,
        label: result.label,
        type: item.type,
        sigils: item.tags.join(', '),
        detail: result.detail,
        haystack: `${result.haystack} ${board.name.toLowerCase()}`,
        focus: { x: item.x + item.width / 2, y: item.y + item.height / 2 },
      })
    }
    for (const thread of board.connections) {
      const result = buildThreadSearchResult(thread, itemMap)
      const from = result.fromItem
      const to = result.toItem
      const focus = from && to
        ? { x: (from.x + from.width / 2 + to.x + to.width / 2) / 2, y: (from.y + from.height / 2 + to.y + to.height / 2) / 2 }
        : { x: 0, y: 0 }
      rows.push({
        kind: 'thread',
        id: thread.id,
        chamberId: board.id,
        chamberName: board.name,
        label: result.label,
        type: thread.meaning ?? 'thread',
        sigils: '',
        detail: result.detail,
        haystack: `${result.haystack} ${board.name.toLowerCase()}`,
        focus,
      })
    }
  }
  return rows
}

export function filterLedgerRows(rows: LedgerRow[], filter: string): LedgerRow[] {
  const needle = filter.trim().toLowerCase()
  if (!needle) return rows
  return rows.filter((row) =>
    row.haystack.includes(needle) ||
    row.chamberName.toLowerCase().includes(needle) ||
    row.type.toLowerCase().includes(needle))
}

const SORT_VALUE: Record<LedgerSortKey, (row: LedgerRow) => string> = {
  label: (row) => row.label.toLowerCase(),
  type: (row) => row.type.toLowerCase(),
  chamber: (row) => row.chamberName.toLowerCase(),
  sigils: (row) => row.sigils.toLowerCase(),
}

export function sortLedgerRows(rows: LedgerRow[], key: LedgerSortKey, direction: LedgerSortDirection): LedgerRow[] {
  const value = SORT_VALUE[key]
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => factor * value(a).localeCompare(value(b)))
}
