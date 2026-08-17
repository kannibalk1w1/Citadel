import React from 'react'
import { useHistoryStore } from '../store/historyStore'
import { useUIStore } from '../store/uiStore'
import { travelHistoryTo } from '../store/historyTravel'
import { liveBoardSnapshots, snapshotCursor, snapshotLabel, snapshotsForBoard } from './boardSnapshots'
import { useCanvasStore } from '../store/canvasStore'
import {
  HISTORY_START,
  defaultMarkerName,
  describeEvent,
  elapsedLabel,
  historyPositionLabel,
  liveMarkers,
  markerCursor,
} from './timeMachineModel'
import { inscribe } from './toasts/inscriptionToastStore'
import { ToolIcon } from './icons/ToolIcon'

/**
 * A scrubber over the board's own history.
 *
 * Undo and recording were built as one timestamped log, which means the whole
 * session is already in memory — the only thing missing was a way to move
 * through it other than one Ctrl+Z at a time. Dragging the slider replays or
 * reverts the same events the keyboard would, so the board assembles and
 * disassembles itself as you scrub.
 *
 * Markers name a moment worth coming back to. They are keyed by event, not by
 * position, because making an edit after scrubbing back truncates the redo
 * stack and every later index moves.
 */
export function TimeMachine(): React.ReactElement | null {
  const open = useUIStore((s) => s.panels.timeMachine)
  const closePanel = useUIStore((s) => s.closePanel)
  const events = useHistoryStore((s) => s.events)
  const cursor = useHistoryStore((s) => s.cursor)
  const markers = useHistoryStore((s) => s.markers)
  const addMarker = useHistoryStore((s) => s.addMarker)
  const removeMarker = useHistoryStore((s) => s.removeMarker)
  const snapshots = useHistoryStore((s) => s.snapshots)
  const activeBoardId = useCanvasStore((s) => s.activeBoardId)

  if (!open) return null

  const total = events.length
  const firstTimestamp = events[0]?.timestamp ?? 0
  const atEvent = cursor >= 0 && cursor < total ? events[cursor] : null
  const shown = liveMarkers(markers, events)
  const frames = liveBoardSnapshots(snapshotsForBoard(snapshots, activeBoardId), events)

  const travel = (target: number): void => { travelHistoryTo(target) }

  return (
    <div
      role="dialog"
      aria-label="Time machine"
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-panels)' as unknown as number,
        width: 'min(620px, 82vw)',
        padding: 'var(--space-5)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
          color: 'var(--text-accent)', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          Time machine
        </span>
        <button
          type="button"
          aria-label="Close the time machine"
          onClick={() => closePanel('timeMachine')}
          style={{
            display: 'flex', background: 'transparent', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer', padding: 2,
          }}
        >
          <ToolIcon name="close" size={14} />
        </button>
      </div>

      {total === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          Nothing has happened on this board yet. Every change from here on can be scrubbed back to.
        </p>
      ) : (
        <>
          {frames.length > 0 && (
            <div
              aria-label="Saved states"
              style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 2 }}
            >
              {frames.map((frame) => {
                const target = snapshotCursor(frame, events)
                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => travel(target)}
                    title={snapshotLabel(frame, events)}
                    aria-label={snapshotLabel(frame, events)}
                    aria-current={target === cursor}
                    style={{
                      flex: '0 0 auto',
                      padding: 0,
                      background: 'none',
                      cursor: 'pointer',
                      lineHeight: 0,
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${target === cursor ? 'var(--accent)' : 'var(--border-muted)'}`,
                    }}
                  >
                    <img
                      src={frame.dataUrl}
                      alt=""
                      width={72}
                      height={Math.max(1, Math.round((frame.height / frame.width) * 72))}
                      style={{ display: 'block', borderRadius: 'calc(var(--radius-sm) - 1px)' }}
                    />
                  </button>
                )
              })}
            </div>
          )}

          <input
            type="range"
            aria-label="Board history"
            min={HISTORY_START}
            max={total - 1}
            step={1}
            value={cursor}
            onChange={(e) => travel(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />

          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            gap: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
          }}>
            <span style={{ color: 'var(--text-primary)' }}>
              {atEvent ? describeEvent(atEvent) : 'The board as this session found it'}
            </span>
            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {atEvent ? `${elapsedLabel(atEvent, firstTimestamp)} · ` : ''}
              {historyPositionLabel(cursor, total)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => travel(HISTORY_START)}
              style={buttonStyle}
            >
              To the start
            </button>
            <button
              type="button"
              onClick={() => travel(total - 1)}
              style={buttonStyle}
            >
              To now
            </button>
            <button
              type="button"
              title="Name this moment so you can come back to it"
              onClick={() => {
                const marker = addMarker(defaultMarkerName(cursor, events))
                inscribe(marker ? `Marked: ${marker.name}` : 'This moment is already marked')
              }}
              style={buttonStyle}
            >
              Mark this moment
            </button>
          </div>

          {shown.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {shown.map((marker) => (
                <span key={marker.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => travel(markerCursor(marker, events))}
                    title={`Go back to "${marker.name}"`}
                    style={{ ...buttonStyle, borderColor: 'var(--accent)' }}
                  >
                    {marker.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Forget the marker "${marker.name}"`}
                    onClick={() => removeMarker(marker.id)}
                    style={{ ...buttonStyle, padding: '2px 4px', display: 'flex' }}
                  >
                    <ToolIcon name="close" size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            Scrubbing moves the same history undo uses. Making a change after going
            back drops everything after this point, exactly as undo then editing does.
          </p>
        </>
      )}
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '3px 8px',
  background: 'var(--bg-ui)',
  border: '1px solid var(--border-muted)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-xs)',
  cursor: 'pointer',
}
