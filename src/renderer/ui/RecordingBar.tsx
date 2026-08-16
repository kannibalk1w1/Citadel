import React, { useRef, useState } from 'react'
import { useHistoryStore } from '../store/historyStore'
import { useCanvasStore } from '../store/canvasStore'
import type { RecordingSession, CanvasItem } from '../../types'
import { ToolIcon } from './icons/ToolIcon'

type MovePatch = { id: string; x: number; y: number }

export function RecordingBar(): React.ReactElement | null {
  const isRecording = useHistoryStore((s) => s.isRecording)
  const startRecording = useHistoryStore((s) => s.startRecording)
  const stopRecording = useHistoryStore((s) => s.stopRecording)
  const saveRecording = useHistoryStore((s) => s.saveRecording)
  const deleteRecording = useHistoryStore((s) => s.deleteRecording)
  const recordings = useHistoryStore((s) => s.recordings)

  const [showList, setShowList] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const playbackRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const handleToggleRecord = () => {
    if (isRecording) {
      const session = stopRecording()
      if (session) saveRecording(session)
    } else {
      startRecording(`Recording ${new Date().toLocaleTimeString()}`)
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

    const canvas = useCanvasStore.getState()
    const origin = session.events[0].timestamp

    session.events.forEach((event) => {
      const delay = event.timestamp - origin
      const tid = setTimeout(() => {
        // Apply event onto current canvas state
        if (event.type === 'ITEM_ADD') {
          canvas.addItem(event.boardId, event.after as CanvasItem)
        } else if (event.type === 'ITEM_MOVE') {
          const moves = event.after as MovePatch | MovePatch[]
          canvas.moveItems(event.boardId, Array.isArray(moves) ? moves : [moves])
        } else if (event.type === 'ITEM_STYLE') {
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
      <div className="citadel-floating-panel" style={barStyle}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-danger)', display: 'inline-block' }} />
        <span style={labelStyle}>Recording</span>
        <button onClick={handleToggleRecord} style={btnStyle}>Stop</button>
      </div>
    )
  }

  if (recordings.length === 0) return null

  return (
    <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 'var(--z-ui)' as React.CSSProperties['zIndex'] }}>
      <button
        className="citadel-panel-button"
        onClick={() => setShowList((v) => !v)}
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '4px 14px',
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-md)',
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
      </button>

      {showList && (
        <div className="citadel-floating-panel" style={{
          marginTop: 4,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 6,
          minWidth: 220,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
        }}>
          {recordings.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '3px 4px', borderRadius: 'var(--radius-sm)' }}>
              <button
                type="button"
                onClick={() => playRecording(r)}
                title={playingId === r.id ? 'Stop playback' : 'Play recording'}
                aria-label={playingId === r.id ? 'Stop playback' : 'Play recording'}
                style={{
                  background: playingId === r.id ? 'rgba(139,32,32,0.2)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: playingId === r.id ? 'var(--accent-danger)' : 'var(--text-secondary)',
                  width: 22, height: 22,
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ToolIcon name={playingId === r.id ? 'stop' : 'play'} size={12} />
              </button>
              <span style={{ flex: 1, fontSize: 'var(--text-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
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
                  fontSize: 'var(--text-lg)',
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
  gap: 'var(--space-4)',
  zIndex: 'var(--z-ui)' as React.CSSProperties['zIndex'],
  boxShadow: 'var(--shadow-md)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-md)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--accent-danger)',
  cursor: 'pointer',
  fontSize: 'var(--text-md)',
}
