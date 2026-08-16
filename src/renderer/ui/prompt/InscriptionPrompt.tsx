import React, { useEffect, useRef, useState } from 'react'
import { useInscriptionPromptStore } from './inscriptionPromptStore'

// Modal replacement for window.prompt (unsupported in Electron).
export function InscriptionPrompt(): React.ReactElement | null {
  const request = useInscriptionPromptStore((s) => s.request)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null!)

  useEffect(() => {
    if (request) {
      setDraft(request.initial)
      window.setTimeout(() => inputRef.current?.select(), 0)
    }
  }, [request])

  if (!request) return null

  const submit = () => useInscriptionPromptStore.getState().submit(draft.trim())
  const cancel = () => useInscriptionPromptStore.getState().cancel()

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 5, 6, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-panels)' as React.CSSProperties['zIndex'],
      }}
    >
      <div
        className="citadel-floating-panel"
        style={{
          width: 320,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {request.title}
        </div>
        {request.multiline ? (
          <textarea
            ref={(element) => { inputRef.current = element }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
              if (e.key === 'Escape') cancel()
            }}
            rows={6}
            aria-label={request.title}
            style={{
              background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', padding: '6px 8px', outline: 'none', resize: 'vertical', minHeight: 110,
            }}
          />
        ) : (
          <input
            ref={(element) => { inputRef.current = element }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') cancel()
            }}
            style={{
              background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', padding: '6px 8px', outline: 'none',
            }}
          />
        )}
        {request.multiline && (
          <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Ctrl+Enter to save</span>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={cancel}
            style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', padding: '4px 10px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            style={{ background: 'var(--bg-ui)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', color: 'var(--text-accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', padding: '4px 10px' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
