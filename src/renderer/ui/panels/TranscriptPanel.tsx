import React from 'react'
import type { CanvasItem } from '../../../types'
import { useCanvasStore } from '../../store/canvasStore'
import { findTranscriptSource, seekTranscriptSegment, transcriptSegments, transcriptTimestamp } from '../../canvas/audioSeek'

export type TranscriptPanelProps = { item: CanvasItem; boardId: string }

/** The immutable recogniser output stays separate from the editable text item. */
export function TranscriptPanel({ item, boardId }: TranscriptPanelProps): React.ReactElement | null {
  const boards = useCanvasStore((state) => state.boards)
  if (item.type !== 'text' || !Array.isArray(item.meta?.transcriptSegments)) return null
  const segments = transcriptSegments(item)
  const { source, reason } = findTranscriptSource(boards, boardId, item)
  return (
    <section aria-label="Original recording transcript" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Original recording transcript</h3>
      <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        These segments keep the original transcription and approximate timestamps. Edits to the text item do not change them. Choose a segment, then press Play on the audio item to listen.
      </p>
      {!source && <p role="status" style={{ margin: 0, color: 'var(--text-muted)' }}>{reason}</p>}
      {segments.length === 0 && <p style={{ margin: 0, color: 'var(--text-muted)' }}>No usable timestamps are available.</p>}
      {segments.length > 0 && segments.length < (item.meta!.transcriptSegments as unknown[]).length && (
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Some segments have invalid timestamps and cannot be shown here.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
        {segments.map((segment, index) => (
          <button
            key={`${index}-${segment.start}`}
            type="button"
            disabled={!source}
            aria-label={`Go to audio at ${transcriptTimestamp(segment.start)}: ${segment.text.trim()}`}
            onClick={() => seekTranscriptSegment(boardId, item.id, segment.start)}
            style={{ display: 'flex', gap: 8, textAlign: 'left', padding: 8, color: 'var(--text-primary)', background: 'var(--bg-ui)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: source ? 'pointer' : 'default' }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', flexShrink: 0 }}>{transcriptTimestamp(segment.start)}</span>
            <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{segment.text.trim()}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
