import { describe, expect, it } from 'vitest'
import type { CanvasBoard, CanvasItem } from '../../types'
import { buildLedgerRows, filterLedgerRows, sortLedgerRows, type LedgerSortKey } from './indexLedgerModel'

function item(id: string, patch: Partial<CanvasItem> = {}): CanvasItem {
  return {
    id,
    type: 'image',
    x: 0, y: 0, width: 100, height: 100,
    rotation: 0, zIndex: 0,
    locked: false, visible: true, opacity: 1,
    tags: [],
    ...patch,
  }
}

const boards: CanvasBoard[] = [
  {
    id: 'b1', name: 'Bones', viewport: { x: 0, y: 0, scale: 1 },
    items: [
      item('i1', { src: 'C:/refs/skull.png', tags: ['anatomy'] }),
      item('i2', { type: 'sticky', meta: { content: 'ribs note' } }),
    ],
    connections: [{
      id: 't1', fromId: 'i1', toId: 'i2',
      fromAnchor: 'auto', toAnchor: 'auto', style: 'bezier',
      color: '#fff', width: 1, arrowHead: 'arrow', dashed: false, label: 'study',
    }],
  },
  {
    id: 'b2', name: 'Armour', viewport: { x: 0, y: 0, scale: 1 },
    items: [item('i3', { src: 'C:/refs/pauldron.jpg' })],
    connections: [],
  },
]

describe('buildLedgerRows', () => {
  it('collects every relic and thread across chambers with chamber identity', () => {
    const rows = buildLedgerRows(boards)
    expect(rows.length).toBe(4)
    expect(rows.filter((r) => r.kind === 'thread').length).toBe(1)
    expect(rows.find((r) => r.id === 'i3')!.chamberName).toBe('Armour')
  })

  it('gives every row a focus point', () => {
    const rows = buildLedgerRows(boards)
    for (const row of rows) {
      expect(Number.isFinite(row.focus.x)).toBe(true)
      expect(Number.isFinite(row.focus.y)).toBe(true)
    }
  })
})

describe('filterLedgerRows', () => {
  it('matches label, chamber, type, and sigils case-insensitively', () => {
    const rows = buildLedgerRows(boards)
    // the thread matches too: its endpoint labels are part of its haystack
    expect(filterLedgerRows(rows, 'SKULL').map((r) => r.id)).toEqual(['i1', 't1'])
    expect(filterLedgerRows(rows, 'armour').map((r) => r.id)).toEqual(['i3'])
    expect(filterLedgerRows(rows, 'anatomy').map((r) => r.id)).toEqual(['i1', 't1'])
    expect(filterLedgerRows(rows, 'sticky').map((r) => r.id)).toEqual(['i2'])
  })

  it('returns everything for a blank filter', () => {
    const rows = buildLedgerRows(boards)
    expect(filterLedgerRows(rows, '  ').length).toBe(rows.length)
  })
})

describe('sortLedgerRows', () => {
  it('sorts by any key in both directions', () => {
    const rows = buildLedgerRows(boards)
    const byLabel = sortLedgerRows(rows, 'label', 'asc')
    expect(byLabel[0].label <= byLabel[byLabel.length - 1].label).toBe(true)
    const byChamberDesc = sortLedgerRows(rows, 'chamber', 'desc')
    expect(byChamberDesc[0].chamberName >= byChamberDesc[byChamberDesc.length - 1].chamberName).toBe(true)
    const keys: LedgerSortKey[] = ['label', 'type', 'chamber', 'sigils']
    for (const key of keys) expect(sortLedgerRows(rows, key, 'asc').length).toBe(rows.length)
  })
})
