import React, { useEffect, useRef } from 'react'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'

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
  const committed = useRef(false)
  // Shallow copy is safe: all current meta fields (content, color, fontSize, align, fontStyle) are primitives.
  // Revisit with a deep clone if nested-object meta fields are ever added.
  const beforeMeta = useRef<Record<string, unknown>>({ ...(item.meta ?? {}) })

  const sx = item.x * viewport.scale + viewport.x
  const sy = item.y * viewport.scale + viewport.y
  const sw = item.width * viewport.scale
  const sh = item.height * viewport.scale
  const fontSize = ((item.meta?.fontSize as number) ?? (item.type === 'sticky' ? 14 : 18)) * viewport.scale
  const isSticky = item.type === 'sticky'

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
    const afterMeta = { ...(item.meta ?? {}), content: val }
    updateItem(activeBoardId, item.id, { meta: afterMeta })
    useHistoryStore.getState().push(
      'ITEM_STYLE',
      activeBoardId,
      { id: item.id, meta: beforeMeta.current },
      { id: item.id, meta: afterMeta },
    )
    close()
  }

  return (
    <textarea
      ref={ref}
      defaultValue={(item.meta?.content as string) ?? ''}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation() // prevent canvas keybinds while typing
        if (e.key === 'Escape') { close() }
        // Single-line text: Enter commits. Sticky: Shift+Enter = newline, Enter = commit
        if (e.key === 'Enter' && !isSticky) { e.preventDefault(); commit() }
        if (e.key === 'Enter' && isSticky && !e.shiftKey) { /* allow newlines */ }
      }}
      style={{
        position: 'fixed',
        left: sx,
        top: sy,
        width: sw,
        height: isSticky ? sh : Math.max(sh, fontSize * 1.6),
        fontSize,
        fontFamily: isSticky ? 'var(--font-body)' : (item.meta?.fontFamily as string ?? 'var(--font-body)'),
        color: isSticky ? 'var(--text-primary)' : (item.meta?.color as string ?? 'var(--text-primary)'),
        background: isSticky ? (item.meta?.color as string ?? '#2a2820') : 'rgba(15,13,11,0.85)',
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
  )
}
