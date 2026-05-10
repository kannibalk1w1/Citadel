import React from 'react'
import { useUIStore } from '../store/uiStore'
import { useCanvasStore } from '../store/canvasStore'

export function TagSearch(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.tagSearch)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const setSelection = useCanvasStore((s) => s.setSelection)
  const items = useCanvasStore((s) => s.items())

  if (!isOpen) return null

  const query = searchQuery.trim().toLowerCase()
  const matches = query
    ? items.filter((i) => i.tags.some((t) => t.toLowerCase().includes(query)))
    : []

  const close = () => {
    setSearchQuery('')
    useUIStore.getState().closePanel('tagSearch')
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--sidebar-right-w) + 8px)',
        width: 240,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 10,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: matches.length > 0 ? 8 : 0 }}>
        <input
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') close() }}
          placeholder="Search tags…"
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
          ×
        </button>
      </div>

      {matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {matches.slice(0, 20).map((item) => (
            <button
              key={item.id}
              onClick={() => { setSelection([item.id]); close() }}
              style={{
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                color: 'var(--text-primary)',
                fontSize: 11,
                padding: '3px 4px',
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {item.tags.join(', ')} <span style={{ color: 'var(--text-muted)' }}>({item.type})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
