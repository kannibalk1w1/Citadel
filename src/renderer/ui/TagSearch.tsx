import React from 'react'
import type { CanvasItem } from '../../types'
import { useUIStore } from '../store/uiStore'
import { useCanvasStore } from '../store/canvasStore'
import { getCommentResults, getSearchResults, type SearchResult } from './itemSearchModel'

const SEARCH_CHIPS = [
  { label: 'Images', token: 'type:image' },
  { label: 'Notes', token: 'type:sticky' },
  { label: 'Comments', token: 'type:comment' },
  { label: 'Hidden', token: 'is:hidden' },
  { label: 'Locked', token: 'is:locked' },
  { label: 'Linked', token: 'has:link' },
  { label: 'Assets', token: 'has:src' },
  { label: 'Tagged', token: 'has:tag' },
] as const

export function TagSearch(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.tagSearch)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const setSearchHighlight = useUIStore((s) => s.setSearchHighlight)
  const setSelection = useCanvasStore((s) => s.setSelection)
  const updateViewport = useCanvasStore((s) => s.updateViewport)
  const viewport = useCanvasStore((s) => s.viewport())
  const items = useCanvasStore((s) => s.items())

  if (!isOpen) return null

  const query = searchQuery.trim().toLowerCase()
  const results = getSearchResults(items, query)
  const commentResults = query ? [] : getCommentResults(items)

  const close = () => {
    setSearchQuery('')
    useUIStore.getState().closePanel('tagSearch')
  }

  const selectResult = (item: CanvasItem) => {
    const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '164')
    const canvasW = window.innerWidth - sidebarW
    const cx = item.x + item.width / 2
    const cy = item.y + item.height / 2

    setSelection([item.id])
    updateViewport({
      x: canvasW / 2 - cx * viewport.scale,
      y: window.innerHeight / 2 - cy * viewport.scale,
    })
    setSearchHighlight(item.id)
    window.setTimeout(() => {
      if (useUIStore.getState().searchHighlightId === item.id) {
        useUIStore.getState().setSearchHighlight(null)
      }
    }, 900)
    close()
  }

  const appendToken = (token: string) => {
    const tokens = searchQuery.trim().split(/\s+/).filter(Boolean)
    if (!tokens.includes(token)) setSearchQuery([...tokens, token].join(' '))
  }

  return (
    <div
      className="citadel-floating-panel"
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--sidebar-right-w) + 8px)',
        width: 320,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 10,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: results.length > 0 || commentResults.length > 0 || query ? 8 : 0 }}>
        <input
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') close() }}
          placeholder="Search items..."
          style={{
            flex: 1,
            background: 'var(--bg-ui)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '5px 8px',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            outline: 'none',
          }}
        />
        <button
          onClick={close}
          title="Close (Escape)"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '2px 4px',
            borderRadius: 3,
          }}
        >
          x
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {SEARCH_CHIPS.map((chip) => {
          const active = searchQuery.toLowerCase().split(/\s+/).includes(chip.token)
          return (
            <button
              key={chip.token}
              type="button"
              onClick={() => appendToken(chip.token)}
              style={{
                background: active ? 'var(--accent)' : 'var(--bg-ui)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 3,
                color: active ? 'var(--bg-canvas)' : 'var(--text-secondary)',
                cursor: active ? 'default' : 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                padding: '3px 5px',
                textTransform: 'uppercase',
              }}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {query && results.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-body)', padding: '4px 2px' }}>
          No items found
        </div>
      )}

      {!query && commentResults.length > 0 && (
        <ResultList title="Comments" results={commentResults} selectResult={selectResult} />
      )}

      {results.length > 0 && (
        <ResultList results={results} selectResult={selectResult} />
      )}
    </div>
  )
}

function ResultList({
  title,
  results,
  selectResult,
}: {
  title?: string
  results: SearchResult[]
  selectResult: (item: CanvasItem) => void
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 340, overflowY: 'auto' }}>
      {title && (
        <div style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '1px 2px 3px' }}>
          {title}
        </div>
      )}
      {results.map(({ item, label, detail }) => (
        <button
          key={item.id}
          onClick={() => selectResult(item)}
          style={{
            background: 'transparent',
            border: '1px solid transparent',
            textAlign: 'left',
            color: 'var(--text-primary)',
            fontSize: 11,
            padding: '5px 6px',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
            <span style={{
              color: 'var(--accent)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: '1px 4px',
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
              textTransform: 'uppercase',
            }}>
              {item.meta?.kind === 'comment' ? 'comment' : item.type}
            </span>
          </div>
          <div style={{
            color: 'var(--text-muted)',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 2,
          }}>
            {detail}
          </div>
        </button>
      ))}
    </div>
  )
}
