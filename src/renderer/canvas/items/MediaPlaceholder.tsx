import React from 'react'
import type { CanvasItem } from '../../../types'
import { mediaPlaceholderLabel } from '../overlays/boardChromeViewModel'

export function MediaPlaceholder({ item, label }: { item: CanvasItem; label?: string | null }): React.ReactElement | null {
  const text = label ?? mediaPlaceholderLabel(item)
  if (!text) return null
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(180deg, #12100d 0%, #080807 100%)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-base)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        textAlign: 'center',
        padding: 12,
        border: '1px dashed var(--border)',
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  )
}

