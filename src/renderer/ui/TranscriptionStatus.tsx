import React from 'react'
import { cancelTranscription } from '../canvas/transcribeAudioItem'
import { useTranscriptionProgressStore } from './transcriptionProgressStore'
import type { TranscriptionRun } from './transcriptionProgressStore'

/**
 * A quiet corner card while a recording is being transcribed. It blocks
 * nothing: the run takes a minute and the board stays usable throughout, which
 * is also why it can be cancelled from here.
 */
export function phaseLabel(run: TranscriptionRun): string {
  switch (run.phase) {
    case 'decoding':
      return 'Reading audio'
    // Loading weights off a cold disk takes seconds during which no percentage
    // moves, so it is named rather than left looking like a hang.
    case 'loading-model':
      return 'Loading model'
    default:
      return `Transcribing ${run.percent}%`
  }
}

export function TranscriptionStatus(): React.ReactElement | null {
  const run = useTranscriptionProgressStore((s) => s.run)
  if (!run) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 16,
        bottom: 56,
        zIndex: 'var(--z-panels)',
        minWidth: 240,
        maxWidth: 320,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        padding: '10px 12px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
      }}>
        <span style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {run.name}
        </span>
        <button
          type="button"
          onClick={() => { void cancelTranscription() }}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            padding: '2px 7px',
          }}
        >
          Cancel
        </button>
      </div>
      <div style={{
        background: 'var(--bg-ui)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        height: 6,
        marginTop: 8,
        overflow: 'hidden',
      }}>
        <div style={{ background: 'var(--accent)', height: '100%', width: `${run.percent}%` }} />
      </div>
      <div style={{
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-sm)',
        marginTop: 6,
      }}>
        {phaseLabel(run)}
      </div>
    </div>
  )
}
