import React from 'react'
import type { CanvasItem } from '../../types'
import { useUIStore } from '../store/uiStore'
import { useCanvasStore } from '../store/canvasStore'

type SearchResult = {
  item: CanvasItem
  label: string
  detail: string
  haystack: string
}

function basename(value: string | undefined): string {
  if (!value) return ''
  const clean = value.split('?')[0].replace(/\\/g, '/')
  return clean.split('/').filter(Boolean).at(-1) ?? value
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function arrayText(value: unknown): string {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').join(', ') : ''
}

function buildResult(item: CanvasItem): SearchResult {
  const content = textValue(item.meta?.content)
  const srcName = basename(item.src)
  const srcAName = basename(textValue(item.meta?.srcA))
  const srcBName = basename(textValue(item.meta?.srcB))
  const swatches = arrayText(item.meta?.colors)

  const label =
    content ||
    srcName ||
    srcAName ||
    srcBName ||
    swatches ||
    `${item.type} ${item.id.slice(0, 6)}`

  const detailParts = [
    item.type,
    item.tags.length ? `tags: ${item.tags.join(', ')}` : '',
    item.src ? `src: ${item.src}` : '',
    item.link ? `link: ${item.link}` : '',
    srcAName ? `A: ${srcAName}` : '',
    srcBName ? `B: ${srcBName}` : '',
    swatches ? `colors: ${swatches}` : '',
  ].filter(Boolean)

  const detail = detailParts.join('  |  ')
  const haystack = [
    item.type,
    item.id,
    item.tags.join(' '),
    item.src ?? '',
    item.link ?? '',
    content,
    textValue(item.meta?.srcA),
    textValue(item.meta?.srcB),
    swatches,
  ].join(' ').toLowerCase()

  return { item, label, detail, haystack }
}

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
  const results = query
    ? items.map(buildResult).filter((r) => r.haystack.includes(query)).slice(0, 30)
    : []

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

  return (
    <div
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
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: results.length > 0 || query ? 8 : 0 }}>
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

      {query && results.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-body)', padding: '4px 2px' }}>
          No items found
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 340, overflowY: 'auto' }}>
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
                  {item.type}
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
      )}
    </div>
  )
}
