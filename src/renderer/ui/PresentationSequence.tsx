import React from 'react'
import type { CanvasItem } from '../../types'
import { orderedPresentationItems } from '../presentation/presentationNavigation'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'

function itemLabel(item: CanvasItem): string {
  const content = typeof item.meta?.content === 'string' ? item.meta.content.trim().replace(/\s+/g, ' ') : ''
  const src = item.src ? item.src.split(/[\\/]/).pop() : ''
  return content || src || `${item.type} ${item.id.slice(0, 6)}`
}

function focusItem(item: CanvasItem): void {
  const sidebarW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-right-w') || '228')
  const canvasW = window.innerWidth - sidebarW
  const canvas = useCanvasStore.getState()
  const viewport = canvas.viewport()
  canvas.setSelection([item.id])
  canvas.updateViewport({
    x: canvasW / 2 - (item.x + item.width / 2) * viewport.scale,
    y: window.innerHeight / 2 - (item.y + item.height / 2) * viewport.scale,
  })
  useUIStore.getState().setSearchHighlight(item.id)
  window.setTimeout(() => {
    if (useUIStore.getState().searchHighlightId === item.id) {
      useUIStore.getState().setSearchHighlight(null)
    }
  }, 900)
}

export function PresentationSequence(): React.ReactElement | null {
  const isOpen = useUIStore((s) => s.panels.presentationSequence)
  const closePanel = useUIStore((s) => s.closePanel)
  const items = useCanvasStore((s) => s.items())
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)
  const updateItem = useCanvasStore((s) => s.updateItem)
  const pushHistory = useHistoryStore((s) => s.push)

  if (!isOpen || !activeBoardId) return null

  const sequence = orderedPresentationItems(items)

  const applyOrder = (nextSequence: CanvasItem[]) => {
    nextSequence.forEach((item, index) => {
      const beforeMeta = { ...item.meta }
      const afterMeta = { ...item.meta, presentationOrder: index + 1 }
      pushHistory('ITEM_STYLE', activeBoardId, { id: item.id, meta: beforeMeta }, { id: item.id, meta: afterMeta })
      updateItem(activeBoardId, item.id, { meta: afterMeta })
    })
  }

  const moveItem = (itemId: string, direction: -1 | 1) => {
    const index = sequence.findIndex((item) => item.id === itemId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= sequence.length) return
    const nextSequence = [...sequence]
    const [item] = nextSequence.splice(index, 1)
    nextSequence.splice(nextIndex, 0, item)
    applyOrder(nextSequence)
  }

  return (
    <div
      className="citadel-floating-panel"
      style={{
        position: 'absolute',
        top: 48,
        right: 'calc(var(--sidebar-right-w) + 8px)',
        width: 280,
        maxHeight: 'calc(100vh - 72px)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 10,
        zIndex: 'var(--z-panels)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Sequence
        </h3>
        <button
          onClick={() => closePanel('presentationSequence')}
          title="Close"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
        >
          x
        </button>
      </div>

      {sequence.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-body)' }}>
          No presentation items
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', paddingRight: 2 }}>
          {sequence.map((item, index) => {
            const selected = selectedIds.includes(item.id)
            return (
              <div
                key={item.id}
                className="citadel-list-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '22px 1fr 24px 24px',
                  gap: 4,
                  alignItems: 'center',
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 4,
                  background: selected ? 'var(--bg-hover)' : 'transparent',
                  padding: 4,
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, textAlign: 'right' }}>
                  {index + 1}
                </span>
                <button
                  onClick={() => focusItem(item)}
                  title={itemLabel(item)}
                  style={{
                    minWidth: 0,
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontFamily: 'var(--font-body)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: 0,
                  }}
                >
                  {itemLabel(item)}
                </button>
                <button
                  onClick={() => moveItem(item.id, -1)}
                  disabled={index === 0}
                  title="Move earlier"
                  style={miniButtonStyle(index === 0)}
                >
                  ^
                </button>
                <button
                  onClick={() => moveItem(item.id, 1)}
                  disabled={index === sequence.length - 1}
                  title="Move later"
                  style={miniButtonStyle(index === sequence.length - 1)}
                >
                  v
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function miniButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 24,
    height: 22,
    background: 'var(--bg-ui)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text-secondary)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    padding: 0,
  }
}
