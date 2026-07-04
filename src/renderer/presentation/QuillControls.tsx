import React from 'react'
import { QUILL_COLORS, QUILL_WIDTHS, useQuillStore } from './quillStore'

const SWATCH_LABELS = ['Chamber accent', 'White', 'Grey']

function ControlButton({ label, title, engaged, onClick }: {
  label: string
  title: string
  engaged?: boolean
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        border: `1px solid ${engaged ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 3,
        background: engaged ? 'var(--bg-panel)' : 'var(--bg-canvas)',
        color: engaged ? 'var(--text-accent)' : 'var(--text-primary)',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        padding: '2px 6px',
      }}
    >
      {label}
    </button>
  )
}

// Quill section of the presentation bar.
export function QuillControls(): React.ReactElement {
  const active = useQuillStore((s) => s.active)
  const color = useQuillStore((s) => s.color)
  const width = useQuillStore((s) => s.width)
  const strokeCount = useQuillStore((s) => s.strokes.length)

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <ControlButton label="Quill" title="Raise or rest the quill (Q)" engaged={active} onClick={() => useQuillStore.getState().toggleActive()} />
      {active && (
        <>
          {QUILL_COLORS.map((swatch, index) => (
            <button
              key={swatch}
              type="button"
              title={SWATCH_LABELS[index]}
              onClick={() => useQuillStore.getState().setColor(swatch)}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: `2px solid ${color === swatch ? 'var(--accent)' : 'var(--border)'}`,
                background: swatch,
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
          {QUILL_WIDTHS.map((option) => (
            <ControlButton
              key={option}
              label={option === QUILL_WIDTHS[0] ? 'Fine' : 'Broad'}
              title={`${option}px stroke`}
              engaged={width === option}
              onClick={() => useQuillStore.getState().setWidth(option)}
            />
          ))}
          <ControlButton label="Undo" title="Undo last stroke" onClick={() => useQuillStore.getState().undoStroke()} />
          {strokeCount > 0 && (
            <ControlButton label="Clear" title="Clear all strokes" onClick={() => useQuillStore.getState().clearStrokes()} />
          )}
        </>
      )}
    </span>
  )
}
