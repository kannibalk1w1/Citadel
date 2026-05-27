import React from 'react'
import type { CanvasRuntimeStats } from '../../performance/canvasRuntimeStats'

type Props = {
  stats: CanvasRuntimeStats
}

export function RuntimeStatsSigil({ stats }: Props): React.ReactElement {
  return (
    <aside
      aria-label="Chamber runtime load"
      className="citadel-floating-panel"
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        width: 172,
        padding: '8px 10px',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--bg-panel) 88%, transparent)',
        color: 'var(--text-secondary)',
        boxShadow: 'var(--shadow-md)',
        pointerEvents: 'none',
        zIndex: 'var(--z-ui)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div
        style={{
          color: 'var(--text-accent)',
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          letterSpacing: 0,
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        Chamber Load
      </div>
      <RuntimeStat label="Mounted" value={`${stats.mountedRelics} / ${stats.totalRelics}`} />
      <RuntimeStat label="DOM" value={String(stats.awakeDOMMedia)} />
      <RuntimeStat label="Sleeping" value={String(stats.sleepingAnimatedRelics)} />
    </aside>
  )
}

function RuntimeStat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 10,
        lineHeight: 1.6,
      }}
    >
      <span>{label}</span>
      <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{value}</strong>
    </div>
  )
}
