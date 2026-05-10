import React, { useRef, useState } from 'react'
import { useHistoryStore } from '../store/historyStore'
import { useCanvasStore } from '../store/canvasStore'
import { useMascotStore } from '../store/mascotStore'
import type { RecordingSession, CanvasItem } from '../../types'

export function RecordingBar(): React.ReactElement | null {
  const isRecording = useHistoryStore((s) => s.isRecording)
  const startRecording = useHistoryStore((s) => s.startRecording)
  const stopRecording = useHistoryStore((s) => s.stopRecording)
  const saveRecording = useHistoryStore((s) => s.saveRecording)
  const deleteRecording = useHistoryStore((s) => s.deleteRecording)
  const recordings = useHistoryStore((s) => s.recordings)
  const triggerEffect = useMascotStore((s) => s.triggerEffect)
  const clearEffect = useMascotStore((s) => s.clearEffect)

  const [showList, setShowList] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const playbackRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const handleToggleRecord = () => {
    if (isRecording) {
      const session = stopRecording()
      if (session) saveRecording(session)
      clearEffect('eye-open')
      triggerEffect('eye-close')
    } else {
      startRecording(`Recording ${new Date().toLocaleTimeString()}`)
      triggerEffect('eye-open')
    }
  }

  const cancelPlayback = () => {
    playbackRef.current.forEach(clearTimeout)
    playbackRef.current = []
    setPlayingId(null)
  }

  const playRecording = (session: RecordingSession) => {
    if (playingId) { cancelPlayback(); return }
    if (session.events.length === 0) return

    setPlayingId(session.id)
    triggerEffect('lighthouse-beam')

    const canvas = useCanvasStore.getState()
    const origin = session.events[0].timestamp

    session.events.forEach((event) => {
      const delay = event.timestamp - origin
      const tid = setTimeout(() => {
        // Apply event onto current canvas state
        if (event.type === 'ITEM_ADD') {
          canvas.addItem(event.boardId, event.after as CanvasItem)
        } else if (event.type === 'ITEM_MOVE' || event.type === 'ITEM_STYLE') {
          const patch = event.after as Partial<CanvasItem> & { id: string }
          canvas.updateItem(event.boardId, patch.id, patch)
        } else if (event.type === 'ITEM_DELETE') {
          const ids = (event.after as { id: string }[]).map((i) => i.id)
          canvas.removeItems(event.boardId, ids)
        }
      }, delay)
      playbackRef.current.push(tid)
    })

    const totalDuration = session.events.at(-1)!.timestamp - origin + 500
    const doneId = setTimeout(() => { setPlayingId(null); playbackRef.current = [] }, totalDuration)
    playbackRef.current.push(doneId)
  }

  const formatDuration = (session: RecordingSession): string => {
    if (session.events.length < 2) return '0s'
    const ms = session.events.at(-1)!.timestamp - session.events[0].timestamp
    return ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
  }

  if (isRecording) {
    return (
      <div style={barStyle}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-danger)', display: 'inline-block', animation: 'pulse 1s infinite' }} />
        <span style={labelStyle}>Recording</span>
        <button onClick={handleToggleRecord} style={btnStyle}>Stop</button>
      </div>
    )
  }

  if (recordings.length === 0) return null

  return (
    <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 'var(--z-ui)' as React.CSSProperties['zIndex'] }}>
      <button
        onClick={() => setShowList((v) => !v)}
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '4px 14px',
          color: 'var(--text-secondary)',
          fontSize: 11,
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
      </button>

      {showList && (
        <div style={{
          marginTop: 4,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: 6,
          minWidth: 220,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          {recordings.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderRadius: 4 }}>
              <button
                onClick={() => playRecording(r)}
                title={playingId === r.id ? 'Stop' : 'Play'}
                style={{
                  background: playingId === r.id ? 'rgba(139,32,32,0.2)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  color: playingId === r.id ? 'var(--accent-danger)' : 'var(--text-secondary)',
                  width: 22, height: 22,
                  cursor: 'pointer',
                  fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {playingId === r.id ? '■' : '▶'}
              </button>
              <span style={{ flex: 1, fontSize: 11, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {formatDuration(r)}
              </span>
              <button
                onClick={() => deleteRecording(r.id)}
                title="Delete"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-danger)',
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: '0 2px',
                  flexShrink: 0,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const barStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'var(--bg-panel)',
  border: '1px solid var(--accent-danger)',
  borderRadius: 20,
  padding: '4px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  zIndex: 'var(--z-ui)' as React.CSSProperties['zIndex'],
  boxShadow: 'var(--shadow-md)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--accent-danger)',
  cursor: 'pointer',
  fontSize: 11,
}
