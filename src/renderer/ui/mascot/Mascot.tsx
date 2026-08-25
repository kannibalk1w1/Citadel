import React, { useEffect, useRef, useState } from 'react'
import { useHistoryStore } from '../../store/historyStore'
import { useUIStore } from '../../store/uiStore'
import { pathToUrl } from '../../utils/pathToUrl'
import { CitadelMascot } from './CitadelMascot'
import { MascotTower } from './MascotTower'

/**
 * Which mascot the rail shows, or none at all.
 *
 * Two are drawn and ship with the app; the third is any image a person points
 * at. The choice belongs to them, which is the whole reason the old keep came
 * back: removing it was a decision made on everyone's behalf.
 */
/** How long a successful save remains visible in the gate. */
const SAVED_GATE_MS = 1600

/** What the board is doing, which is all any mascot here reacts to. */
export function useMascotState(): 'rest' | 'unsaved' | 'saved' | 'recording' {
  const isDirty = useHistoryStore((s) => s.cursor !== s.savedCursor)
  const isRecording = useHistoryStore((s) => s.isRecording)
  const [justSaved, setJustSaved] = useState(false)
  const wasDirty = useRef(isDirty)

  // A clean board only counts as saved when it was dirty first. This avoids
  // presenting the launch state as an acknowledgement.
  useEffect(() => {
    if (wasDirty.current && !isDirty) {
      setJustSaved(true)
      const timer = setTimeout(() => setJustSaved(false), SAVED_GATE_MS)
      wasDirty.current = isDirty
      return () => clearTimeout(timer)
    }
    wasDirty.current = isDirty
    return undefined
  }, [isDirty])

  return isRecording ? 'recording' : justSaved ? 'saved' : isDirty ? 'unsaved' : 'rest'
}

type Props = { size?: number }

export function Mascot({ size = 26 }: Props): React.ReactElement | null {
  const mascot = useUIStore((s) => s.mascot)
  const mascotImage = useUIStore((s) => s.mascotImage)
  const state = useMascotState()

  if (mascot === 'none') return null

  if (mascot === 'custom' && mascotImage) {
    return (
      <img
        src={pathToUrl(mascotImage)}
        alt="Citadel"
        title="Citadel"
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    )
  }

  if (mascot === 'rook') return <MascotTower size={size} />

  // The tower, and what 'custom' shows before an image is chosen: a fallback,
  // not a gap where the badge should be. It is the default, so an unrecognised
  // saved value lands here rather than on a blank rail.
  return (
    <div
      className="citadel-mascot"
      data-state={state}
      role="img"
      aria-label="Citadel"
      title="Citadel"
      style={{ display: 'grid', placeItems: 'center' }}
    >
      <CitadelMascot size={size} state={state} />
    </div>
  )
}
