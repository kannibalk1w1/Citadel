import React, { useEffect, useRef, useState } from 'react'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'

const STICKY_COLORS = ['#2a2820', '#1a1f2a', '#1f2a1a', '#2a1a1a', '#2a2a1a', '#1a2a27'] as const
const FONT_SIZES = [
  { label: 'S', value: 12 },
  { label: 'M', value: 14 },
  { label: 'L', value: 18 },
] as const
const ALIGNS = [
  { label: 'L', value: 'left' },
  { label: 'C', value: 'center' },
  { label: 'R', value: 'right' },
] as const
const TOOLBAR_H = 38

type Props = { item: CanvasItem }

/**
 * Positions an HTML <textarea> over a text or sticky item so the user can type.
 * Rendered in screen-space (outside Konva) so it receives real keyboard events.
 */
export function TextEditOverlay({ item }: Props): React.ReactElement {
  const viewport = useCanvasStore((s) => s.viewport())
  const updateItem = useCanvasStore((s) => s.updateItem)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)!
  const setEditingItemId = useUIStore((s) => s.setEditingItemId)
  const ref = useRef<HTMLTextAreaElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const committed = useRef(false)
  // Shallow copy is safe: all current meta fields (content, color, fontSize, align, fontStyle) are primitives.
  // Revisit with a deep clone if nested-object meta fields are ever added.
  const beforeMeta = useRef<Record<string, unknown>>({ ...(item.meta ?? {}) })
  const [pendingMeta, setPendingMeta] = useState<Record<string, unknown>>({ ...(item.meta ?? {}) })

  const applyMeta = (patch: Record<string, unknown>) => {
    const next = { ...pendingMeta, ...patch }
    setPendingMeta(next)
    updateItem(activeBoardId, item.id, { meta: next })
  }

  const sx = item.x * viewport.scale + viewport.x
  const sy = item.y * viewport.scale + viewport.y
  const sw = item.width * viewport.scale
  const sh = item.height * viewport.scale
  const isSticky = item.type === 'sticky'
  const displayFontSize = ((pendingMeta.fontSize as number) ?? (isSticky ? 14 : 18)) * viewport.scale
  const fitsAbove = sy >= TOOLBAR_H + 8
  const fitsBelow = sy + sh + 4 + TOOLBAR_H <= window.innerHeight
  const toolbarTop = fitsAbove ? sy - TOOLBAR_H - 4
    : fitsBelow ? sy + sh + 4
    : sy - TOOLBAR_H - 4

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const close = () => setEditingItemId(null)

  const commit = () => {
    if (committed.current) return
    committed.current = true
    const val = ref.current?.value ?? ''
    const afterMeta = { ...pendingMeta, content: val }
    updateItem(activeBoardId, item.id, { meta: afterMeta })
    useHistoryStore.getState().push(
      'ITEM_STYLE',
      activeBoardId,
      { id: item.id, meta: beforeMeta.current },
      { id: item.id, meta: afterMeta },
    )
    close()
  }

  const revert = () => {
    if (committed.current) return
    committed.current = true
    updateItem(activeBoardId, item.id, { meta: beforeMeta.current })
    close()
  }

  return (
    <>
      {isSticky && (
        <div
          ref={toolbarRef}
          style={{
            position: 'fixed',
            left: sx,
            top: toolbarTop,
            height: TOOLBAR_H,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 201,
          }}
        >
          {/* Colour swatches */}
          <div style={{ display: 'flex', gap: 4 }}>
            {STICKY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyMeta({ color: c }) }}
                style={{
                  width: 16, height: 16,
                  background: c,
                  border: pendingMeta.color === c
                    ? '1.5px solid var(--accent)'
                    : '1.5px solid var(--border)',
                  borderRadius: 3,
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              />
            ))}
            <input
              type="color"
              value={(pendingMeta.color as string) ?? '#2a2820'}
              onChange={(e) => applyMeta({ color: e.target.value })}
              style={{
                width: 16, height: 16,
                padding: 0, border: 'none', background: 'none', cursor: 'pointer',
              }}
              title="Custom colour"
            />
          </div>
          {/* Font size */}
          <div style={{ display: 'flex', gap: 2 }}>
            {FONT_SIZES.map(({ label, value }) => {
              const active = (pendingMeta.fontSize ?? 14) === value
              return (
                <button
                  key={value}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyMeta({ fontSize: value }) }}
                  style={{
                    width: 22, height: 22,
                    background: active ? 'var(--accent)' : 'var(--bg-canvas)',
                    color: active ? '#0f0d0b' : 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {/* Alignment */}
          <div style={{ display: 'flex', gap: 2 }}>
            {ALIGNS.map(({ label, value }) => {
              const active = (pendingMeta.align ?? 'left') === value
              return (
                <button
                  key={value}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyMeta({ align: value }) }}
                  style={{
                    width: 22, height: 22,
                    background: active ? 'var(--accent)' : 'var(--bg-canvas)',
                    color: active ? '#0f0d0b' : 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {/* Bold */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyMeta({ fontStyle: pendingMeta.fontStyle === 'bold' ? 'normal' : 'bold' }) }}
            style={{
              width: 22, height: 22,
              background: pendingMeta.fontStyle === 'bold' ? 'var(--accent)' : 'var(--bg-canvas)',
              color: pendingMeta.fontStyle === 'bold' ? '#0f0d0b' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: 0,
            }}
          >
            B
          </button>
        </div>
      )}
      <textarea
        ref={ref}
        defaultValue={(item.meta?.content as string) ?? ''}
        onBlur={(e) => {
          if (toolbarRef.current?.contains(e.relatedTarget as Node)) return
          commit()
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') { revert(); return }
          if (e.key === 'Enter' && !isSticky) { e.preventDefault(); commit() }
        }}
        style={{
          position: 'fixed',
          left: sx,
          top: sy,
          width: sw,
          height: isSticky ? sh : Math.max(sh, displayFontSize * 1.6),
          fontSize: displayFontSize,
          fontFamily: isSticky
            ? 'var(--font-body)'
            : ((item.meta?.fontFamily as string) ?? 'var(--font-body)'),
          fontWeight: isSticky ? (pendingMeta.fontStyle === 'bold' ? 700 : 400) : 400,
          textAlign: isSticky
            ? ((pendingMeta.align as string) ?? 'left') as React.CSSProperties['textAlign']
            : 'left',
          color: isSticky
            ? 'var(--text-primary)'
            : ((item.meta?.color as string) ?? 'var(--text-primary)'),
          background: isSticky
            ? ((pendingMeta.color as string) ?? '#2a2820')
            : 'rgba(15,13,11,0.85)',
          border: '1.5px solid var(--accent)',
          borderRadius: isSticky ? 4 : 2,
          padding: isSticky ? 8 : '2px 4px',
          resize: 'none',
          outline: 'none',
          overflow: 'hidden',
          zIndex: 200,
          lineHeight: 1.4,
          boxSizing: 'border-box',
        }}
      />
    </>
  )
}
