import React, { useEffect, useRef, useState } from 'react'
import { useInscriptionPromptStore } from './inscriptionPromptStore'

// Modal replacement for window.prompt (unsupported in Electron).
export function InscriptionPrompt(): React.ReactElement | null {
  const request = useInscriptionPromptStore((s) => s.request)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
          borderRadius: 6,
          boxShadow: 'var(--shadow-md)',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-display)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {request.title}
        </div>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') cancel()
          }}
          style={{
            background: 'var(--bg-ui)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            padding: '6px 8px',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button
            type="button"
            onClick={cancel}
            style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 10px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            style={{ background: 'var(--bg-ui)', border: '1px solid var(--accent)', borderRadius: 3, color: 'var(--text-accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 10px' }}
          >
            Inscribe
          </button>
        </div>
      </div>
    </div>
  )
}
