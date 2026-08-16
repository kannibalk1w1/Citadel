import React from 'react'
import { useInscriptionToastStore } from './inscriptionToastStore'

// Bottom-center verbal confirmations. Rendered once in the app shell.
export function InscriptionToasts(): React.ReactElement | null {
  const toasts = useInscriptionToastStore((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 56,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
        zIndex: 'var(--z-panels)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="citadel-motion-toast"
          style={{
            background: 'color-mix(in srgb, var(--bg-panel) 94%, transparent)',
            border: toast.tone === 'danger' ? '1px solid var(--accent-danger)' : '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            letterSpacing: '0.02em',
            padding: '6px 14px',
          }}
        >
          <span aria-hidden="true" style={{ color: toast.tone === 'danger' ? 'var(--accent-danger)' : 'var(--text-accent)', marginRight: 6 }}>•</span>
          {toast.text}
        </div>
      ))}
    </div>
  )
}
