import React from 'react'
import { useUIStore } from '../store/uiStore'
import { useCanvasStore } from '../store/canvasStore'
import {
  getCommentResults,
  getIndexResults,
  groupSearchResults,
  indexKeyAction,
  isItemSearchResult,
  firstRelatedThread,
  nextSearchResultIndex,
  resultBadgeLabel,
  threadFocusPoint,
  type SearchResult,
} from './itemSearchModel'

const SEARCH_CHIPS = [
  { label: 'Images', token: 'type:image' },
  { label: 'Notes', token: 'type:sticky' },
  { label: 'Comments', token: 'type:comment' },
  { label: 'Hidden', token: 'is:hidden' },
  { label: 'Locked', token: 'is:locked' },
  { label: 'Linked', token: 'has:link' },
  { label: 'Relics', token: 'has:src' },
  { label: 'Sigils', token: 'has:tag' },
  { label: 'Threads', token: 'type:thread' },
  { label: 'Meanings', token: 'has:meaning' },
  { label: 'Memory', token: 'meaning:memory' },
  { label: 'Questions', token: 'meaning:question' },
] as const

export function TagSearch(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.tagSearch)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const setSearchHighlight = useUIStore((s) => s.setSearchHighlight)
  const setSelection = useCanvasStore((s) => s.setSelection)
  const clearSelection = useCanvasStore((s) => s.clearSelection)
  const updateViewport = useCanvasStore((s) => s.updateViewport)
  const viewport = useCanvasStore((s) => s.viewport())
  const items = useCanvasStore((s) => s.items())
  const connections = useCanvasStore((s) => s.connections())
  const [activeResultIndex, setActiveResultIndex] = React.useState(-1)

  const query = searchQuery.trim().toLowerCase()
  const results = getIndexResults(items, connections, query)
  const groupedResults = groupSearchResults(results)
  const commentResults = query ? [] : getCommentResults(items)

  React.useEffect(() => {
    setActiveResultIndex((index) => {
      if (results.length === 0) return -1
      if (index < 0) return 0
      return Math.min(index, results.length - 1)
    })
  }, [query, results.length])

  if (!isOpen) return null

  const close = () => {
    setSearchQuery('')
    setActiveResultIndex(-1)
    useUIStore.getState().closePanel('tagSearch')
  }

  const focusPoint = (x: number, y: number) => {
    const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '164')
    const canvasW = window.innerWidth - sidebarW

    updateViewport({
      x: canvasW / 2 - x * viewport.scale,
      y: window.innerHeight / 2 - y * viewport.scale,
    })
  }

  const focusResult = (result: SearchResult, closeAfterFocus: boolean) => {
    if (isItemSearchResult(result)) {
      const cx = result.item.x + result.item.width / 2
      const cy = result.item.y + result.item.height / 2

      setSelection([result.item.id])
      focusPoint(cx, cy)
      setSearchHighlight(result.item.id)
      useUIStore.getState().setActiveConnectionId(firstRelatedThread(result.item.id, connections)?.id ?? null)
      window.setTimeout(() => {
        if (useUIStore.getState().searchHighlightId === result.item.id) {
          useUIStore.getState().setSearchHighlight(null)
        }
      }, 900)
      if (closeAfterFocus) close()
      return
    }

    if (result.fromItem && result.toItem) {
      const point = threadFocusPoint(result.fromItem, result.toItem)
      focusPoint(point.x, point.y)
    }
    clearSelection()
    useUIStore.getState().setActiveConnectionId(result.thread.id)
    useUIStore.getState().openPanel('connectionProperties')
    if (closeAfterFocus) close()
  }

  const selectResult = (result: SearchResult) => {
    focusResult(result, true)
  }

  const stepResult = (direction: 1 | -1) => {
    const index = nextSearchResultIndex(activeResultIndex, results.length, direction)
    if (index === -1) return
    setActiveResultIndex(index)
    focusResult(results[index], false)
  }

  const handleIndexKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const action = indexKeyAction(event.key, event.ctrlKey)
    if (action.type === 'none') return

    event.preventDefault()
    if (action.type === 'close') {
      close()
      return
    }

    if (action.type === 'step') {
      stepResult(action.direction)
      return
    }

    const result = results[activeResultIndex]
    if (result) focusResult(result, !action.keepOpen)
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
          onKeyDown={handleIndexKeyDown}
          placeholder="Search the Index..."
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

      {results.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {activeResultIndex + 1} / {results.length}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={() => stepResult(-1)}
              title="Previous result (ArrowUp)"
              style={navButtonStyle}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => stepResult(1)}
              title="Next result (ArrowDown)"
              style={navButtonStyle}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {query && results.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-body)', padding: '4px 2px' }}>
          No items found
        </div>
      )}

      {!query && commentResults.length > 0 && (
        <ResultList title="Comments" results={commentResults} selectResult={selectResult} />
      )}

      {results.length > 0 && groupedResults.map((group) => (
        group.results.length > 0
          ? <ResultList key={group.id} title={group.title} results={group.results} activeItemId={results[activeResultIndex]?.id ?? null} selectResult={selectResult} />
          : null
      ))}
    </div>
  )
}

const navButtonStyle: React.CSSProperties = {
  background: 'var(--bg-ui)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  padding: '3px 6px',
  textTransform: 'uppercase',
}

function ResultList({
  title,
  results,
  activeItemId,
  selectResult,
}: {
  title?: string
  results: SearchResult[]
  activeItemId?: string | null
  selectResult: (result: SearchResult) => void
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 340, overflowY: 'auto' }}>
      {title && (
        <div style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '1px 2px 3px' }}>
          {title}
        </div>
      )}
      {results.map((result) => {
        const active = result.id === activeItemId
        return (
        <button
          key={result.id}
          onClick={() => selectResult(result)}
          style={{
            background: active ? 'var(--bg-hover)' : 'transparent',
            border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
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
            e.currentTarget.style.background = active ? 'var(--bg-hover)' : 'transparent'
            e.currentTarget.style.borderColor = active ? 'var(--accent)' : 'transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {result.label}
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
              {resultBadge(result)}
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
            {result.detail}
          </div>
        </button>
        )
      })}
    </div>
  )
}

function resultBadge(result: SearchResult): string {
  return resultBadgeLabel(result)
}
