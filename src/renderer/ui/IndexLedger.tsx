import React, { useMemo, useState } from 'react'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { activeArchiveRailWidth } from './shell/shellModel'
import { ToolIcon } from './icons/ToolIcon'
import {
  buildLedgerRows,
  filterLedgerRows,
  sortLedgerRows,
  type LedgerRow,
  type LedgerSortDirection,
  type LedgerSortKey,
} from './indexLedgerModel'

const COLUMNS: { key: LedgerSortKey; title: string; width: string }[] = [
  { key: 'label', title: 'Item / Connection', width: '38%' },
  { key: 'type', title: 'Type', width: '16%' },
  { key: 'chamber', title: 'Board', width: '20%' },
  { key: 'sigils', title: 'Tags', width: '26%' },
]

// The Ledger: a structured table lens over every chamber in the archive.
export function IndexLedger(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.indexLedger)
  const boards = useCanvasStore((s) => s.boards)
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<LedgerSortKey>('chamber')
  const [direction, setDirection] = useState<LedgerSortDirection>('asc')

  // Building the rows walks every item and connection in every board, so it is
  // keyed on the boards alone. Typing in the filter box and flipping a sort
  // column re-run only the passes that those inputs actually change.
  const allRows = useMemo(() => (isOpen ? buildLedgerRows(boards) : []), [isOpen, boards])
  const filteredRows = useMemo(() => filterLedgerRows(allRows, filter), [allRows, filter])
  const rows = useMemo(
    () => sortLedgerRows(filteredRows, sortKey, direction),
    [filteredRows, sortKey, direction],
  )

  if (!isOpen) return null

  const headerClick = (key: LedgerSortKey) => {
    if (key === sortKey) setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setDirection('asc')
    }
  }

  const travel = (row: LedgerRow) => {
    const canvas = useCanvasStore.getState()
    if (row.chamberId !== canvas.activeBoardId) canvas.setActiveBoard(row.chamberId)
    const expandedRailWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
    const sidebarW = activeArchiveRailWidth(useUIStore.getState().archiveRailCollapsed, expandedRailWidth)
    const scale = canvas.viewport().scale
    canvas.updateViewport({
      x: (window.innerWidth - sidebarW) / 2 - row.focus.x * scale,
      y: window.innerHeight / 2 - row.focus.y * scale,
    })
    if (row.kind === 'relic') {
      canvas.setSelection([row.id])
      useUIStore.getState().setSearchHighlight(row.id)
      window.setTimeout(() => {
        if (useUIStore.getState().searchHighlightId === row.id) useUIStore.getState().setSearchHighlight(null)
      }, 900)
    }
  }

  return (
    <div
      className="citadel-floating-panel"
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--context-rail-w) + 8px)',
        width: 560,
        maxHeight: 'calc(100vh - 72px)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 10,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Index
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
            {rows.length} entries
          </span>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onClick={() => useUIStore.getState().closePanel('indexLedger')}
            style={{
              width: 22, height: 22,
              background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ToolIcon name="close" size={13} />
          </button>
        </div>
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter the index…"
        style={{
          background: 'var(--bg-ui)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base)',
          padding: '4px 8px',
          outline: 'none',
        }}
      />

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
        {COLUMNS.map((column) => (
          <button
            key={column.key}
            type="button"
            onClick={() => headerClick(column.key)}
            title={`Sort by ${column.title.toLowerCase()}`}
            aria-label={`Sort by ${column.title.toLowerCase()}`}
            aria-sort={sortKey === column.key ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            style={{
              width: column.width,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              background: 'none',
              border: 'none',
              color: sortKey === column.key ? 'var(--text-accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textAlign: 'left',
              padding: 0,
            }}
          >
            {column.title}
            {sortKey === column.key && <ToolIcon name={direction === 'asc' ? 'sortAsc' : 'sortDesc'} size={11} />}
          </button>
        ))}
      </div>

      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {rows.map((row) => (
          <button
            key={`${row.chamberId}-${row.kind}-${row.id}`}
            type="button"
            className="citadel-list-row"
            title={row.detail}
            onClick={() => travel(row)}
            style={{
              display: 'flex',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              padding: '4px 0',
              textAlign: 'left',
            }}
          >
            <span style={{ width: COLUMNS[0].width, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6, display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              {row.kind === 'thread' && <ToolIcon name="connect" size={12} />}
              {row.label}
            </span>
            <span style={{ width: COLUMNS[1].width, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
              {row.type}
            </span>
            <span style={{ width: COLUMNS[2].width, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>
              {row.chamberName}
            </span>
            <span style={{ width: COLUMNS[3].width, color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.sigils}
            </span>
          </button>
        ))}
        {rows.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ToolIcon name="search" size={14} />
            Nothing in the index matches.
          </span>
        )}
      </div>
    </div>
  )
}
