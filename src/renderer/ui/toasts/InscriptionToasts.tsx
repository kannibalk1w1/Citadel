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
        gap: 6,
        zIndex: 'var(--z-panels)',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes inscription-rise {
          from { opacity: 0; transform: translateY(8px); }
          12%  { opacity: 1; transform: translateY(0); }
          82%  { opacity: 1; }
          to   { opacity: 0; }
        }
        .citadel-inscription-toast {
          animation: inscription-rise 2600ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes inscription-rise {
            from { opacity: 0; transform: none; }
            12%  { opacity: 1; }
            82%  { opacity: 1; }
            to   { opacity: 0; }
          }
        }
      `}</style>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="citadel-inscription-toast"
          style={{
            background: 'color-mix(in srgb, var(--bg-panel) 94%, transparent)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            boxShadow: 'var(--shadow-md)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            letterSpacing: '0.02em',
            padding: '6px 14px',
          }}
        >
          <span style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-display)', marginRight: 6 }}>❧</span>
          {toast.text}
        </div>
      ))}
    </div>
  )
}
