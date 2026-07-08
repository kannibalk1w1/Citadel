import React from 'react'
import { useArchiveProgressStore } from './archiveProgressStore'

// Full-screen veil shown while a .citadelz archive is being unsealed (import)
// or sealed (export). Blocks all interaction beneath it; not cancellable.
export function ArchiveRiteOverlay(): React.ReactElement | null {
  const rite = useArchiveProgressStore((s) => s.rite)
  if (!rite) return null

  const title = rite.op === 'import' ? 'Unsealing the archive…' : 'Sealing the archive…'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-panels)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--bg-canvas) 78%, transparent)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <style>{`
        @keyframes archive-rite-shimmer {
          from { background-position: -120px 0; }
          to   { background-position: 120px 0; }
        }
        .archive-rite-bar-fill {
          background-image: linear-gradient(90deg, transparent, color-mix(in srgb, var(--text-accent) 35%, transparent), transparent);
          background-size: 120px 100%;
          background-repeat: no-repeat;
          animation: archive-rite-shimmer 1400ms linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .archive-rite-bar-fill { animation: none; background-image: none; }
        }
      `}</style>
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          boxShadow: 'var(--shadow-md)',
          minWidth: 320,
          padding: '22px 28px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.06em', marginBottom: 14 }}>
          {title}
        </div>
        <div style={{ background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 3, height: 8, overflow: 'hidden' }}>
          <div
            className="archive-rite-bar-fill"
            style={{ background: 'var(--text-accent)', height: '100%', transition: 'width 120ms linear', width: `${rite.percent}%` }}
          />
        </div>
        <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 11, marginTop: 10, opacity: 0.8 }}>
          {rite.percent}%{rite.label ? ` — ${rite.label}` : ''}
        </div>
      </div>
    </div>
  )
}
