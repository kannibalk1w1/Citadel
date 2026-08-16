import React from 'react'
import { useStudyStore } from '../presentation/studyStore'
import {
  formatStudyClock,
  isStudyFinalStretch,
  studyElapsedFraction,
  studyProgressLabel,
} from '../presentation/studySession'
import { ToolIcon } from './icons/ToolIcon'

/**
 * The countdown for a running study session.
 *
 * Sits low and centre: while drawing you glance at it, you do not read it, so
 * it is a ring and two numbers rather than a panel. The ring is the interval
 * draining away — peripheral vision catches a shrinking arc long before it
 * catches a digit changing.
 */

const RING_SIZE = 34
const RING_RADIUS = 14
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ControlButton({ label, icon, onClick }: {
  label: string
  icon: Parameters<typeof ToolIcon>[0]['name']
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        background: 'var(--bg-ui)',
        border: '1px solid var(--border-muted)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
      }}
    >
      <ToolIcon name={icon} size={13} />
    </button>
  )
}

export function StudySessionBar(): React.ReactElement | null {
  const status = useStudyStore((s) => s.status)
  const index = useStudyStore((s) => s.index)
  const queue = useStudyStore((s) => s.queue)
  const remainingMs = useStudyStore((s) => s.remainingMs)
  const intervalSeconds = useStudyStore((s) => s.intervalSeconds)
  const pause = useStudyStore((s) => s.pause)
  const resume = useStudyStore((s) => s.resume)
  const stop = useStudyStore((s) => s.stop)
  const advance = useStudyStore((s) => s.advance)

  if (status === 'idle') return null

  const finished = status === 'finished'
  const spent = studyElapsedFraction(remainingMs, intervalSeconds * 1000)
  const urgent = status === 'running' && isStudyFinalStretch(remainingMs)

  return (
    <div
      role="status"
      aria-label="Study session"
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '8px 12px',
        background: 'var(--bg-panel)',
        border: `1px solid ${urgent ? 'var(--accent-danger)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {!finished && (
        <svg width={RING_SIZE} height={RING_SIZE} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
            fill="none" stroke="var(--border-muted)" strokeWidth={2.5}
          />
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
            fill="none"
            stroke={urgent ? 'var(--accent-danger)' : 'var(--accent)'}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * spent}
          />
        </svg>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
        <span style={{
          color: urgent ? 'var(--accent-danger)' : 'var(--text-primary)',
          fontSize: 'var(--text-lg)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {finished ? 'Done' : formatStudyClock(remainingMs)}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
          {studyProgressLabel(index, queue.length)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <ControlButton label="Previous image" icon="chevronLeft" onClick={() => advance(-1)} />
        {status === 'running'
          ? <ControlButton label="Pause session" icon="pause" onClick={pause} />
          : !finished && <ControlButton label="Resume session" icon="play" onClick={resume} />}
        <ControlButton label="Next image" icon="chevronRight" onClick={() => advance(1)} />
        <ControlButton label="End session" icon="close" onClick={stop} />
      </div>
    </div>
  )
}
