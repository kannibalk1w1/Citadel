import React, { useEffect, useRef, useState } from 'react'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'

/**
 * The rook that gives the rail a bit of character.
 *
 * The previous mascot was removed for good reason: it was driven by a
 * `triggerEffect` queue threaded through twenty files, pushing into a store
 * that by the end nothing drained. This one has no plumbing at all. It reads
 * two booleans the history store already keeps — whether there is unsaved work,
 * and whether a recording is running — so adding it touches no call site and
 * there is nothing to leave dangling if it is removed again.
 *
 * Drawn rather than bundled. The old tower was a PNG with no provenance on
 * record, which is exactly the kind of asset the release audit had to unpick;
 * an inline SVG is original, weighs nothing, and stays sharp at any size.
 */
type Props = { size?: number }

/** How long the acknowledgement after a save stays lit. */
const SAVED_GLOW_MS = 1600

export function MascotTower({ size = 26 }: Props): React.ReactElement | null {
  const visible = useUIStore((s) => s.mascotVisible)
  const isDirty = useHistoryStore((s) => s.cursor !== s.savedCursor)
  const isRecording = useHistoryStore((s) => s.isRecording)

  // A save is the moment work stops being dirty, which is observable without
  // anything having to tell the tower it happened.
  const [justSaved, setJustSaved] = useState(false)
  const wasDirty = useRef(isDirty)
  useEffect(() => {
    if (wasDirty.current && !isDirty) {
      setJustSaved(true)
      const timer = setTimeout(() => setJustSaved(false), SAVED_GLOW_MS)
      wasDirty.current = isDirty
      return () => clearTimeout(timer)
    }
    wasDirty.current = isDirty
    return undefined
  }, [isDirty])

  if (!visible) return null

  const state = isRecording ? 'recording' : justSaved ? 'saved' : isDirty ? 'unsaved' : 'rest'
  const label = {
    recording: 'Citadel — recording',
    saved: 'Citadel — saved',
    unsaved: 'Citadel — unsaved changes',
    rest: 'Citadel',
  }[state]

  const glow = state === 'saved' ? 'var(--accent)' : state === 'recording' ? '#8b2020' : 'var(--border)'

  return (
    <div
      className="citadel-mascot"
      data-state={state}
      role="img"
      aria-label={label}
      title={label}
      style={{ width: size, height: size * (56 / 48), display: 'grid', placeItems: 'center' }}
    >
      <svg viewBox="0 0 48 56" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Battlements */}
        <rect x="8" y="14" width="6" height="9" rx="1" fill="var(--text-secondary)" />
        <rect x="16" y="12" width="6" height="11" rx="1" fill="var(--text-secondary)" />
        <rect x="26" y="12" width="6" height="11" rx="1" fill="var(--text-secondary)" />
        <rect x="34" y="14" width="6" height="9" rx="1" fill="var(--text-secondary)" />
        {/* Body */}
        <rect x="10" y="21" width="28" height="31" rx="2" fill="var(--text-secondary)" />
        {/* Gate, cut back to the panel so the tower reads as a silhouette */}
        <path d="M18 52 L18 41 Q24 35 30 41 L30 52 Z" fill="var(--bg-panel)" />
        {/* The one lit detail: dark at rest, the accent on a save, red while recording */}
        <circle cx="24" cy="30" r="3.5" fill={glow}>
          {state === 'recording' && (
            <animate attributeName="opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />
          )}
        </circle>
      </svg>
    </div>
  )
}
