import type { CanvasItem } from '../../types'
import { TRANSCRIPTION_LIMITS } from '../../types/transcription'
import type { TranscriptionRequest, TranscriptionResult } from '../../types/transcription'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { canvasColor } from '../theme/canvasColors'
import { inscribe } from '../ui/toasts/inscriptionToastStore'
import { useTranscriptionProgressStore } from '../ui/transcriptionProgressStore'
import { projectSessionRevision } from '../utils/projectSession'
import {
  buildTranscriptItem,
  decodeAudioToPcm16,
  transcribedMessage,
  transcriptionFailureMessage,
  transcriptSourceConnection,
} from './audioTranscription'

/**
 * The transcribe flow, end to end: decode here, recognise in main, and put what
 * comes back on the canvas as a text item connected to the recording it came
 * from. The pure parts live in `audioTranscription.ts`; this is the effectful
 * half that touches the stores.
 */

type Ipc = { invoke: (channel: string, args?: unknown) => Promise<unknown> }

const getIpc = (): Ipc => (window as unknown as { ipc: Ipc }).ipc

function fileNameOf(item: CanvasItem): string {
  return item.src?.split(/[\\/]/).pop() ?? 'That recording'
}

/** Stops a run in flight. The main process answers the invoke with `cancelled`. */
export async function cancelTranscription(): Promise<void> {
  await getIpc().invoke('audio:cancelTranscribe').catch(() => {})
}

export async function transcribeAudioItem(item: CanvasItem): Promise<void> {
  const name = fileNameOf(item)
  if (!item.src) {
    inscribe(transcriptionFailureMessage(name, 'unsupported-source'), { tone: 'danger' })
    return
  }

  // Keep the destination tied to the chamber where the run began. The user
  // can switch chambers while local recognition is running; using the active
  // chamber at completion would otherwise create a transcript with a dangling
  // connection or silently attach it to an unrelated recording.
  const originBoardId = useCanvasStore.getState().activeBoardId
  if (!originBoardId) return
  const originSourcePath = item.src
  const originProjectRevision = projectSessionRevision()

  const progress = useTranscriptionProgressStore.getState()
  progress.begin(item.id, name)

  try {
    const decoded = await decodeAudioToPcm16(item.src)
    if (!decoded.ok) {
      inscribe(transcriptionFailureMessage(name, decoded.code), { tone: 'danger' })
      return
    }

    const request: TranscriptionRequest = {
      sourcePath: item.src,
      samples: decoded.samples,
      sampleRate: TRANSCRIPTION_LIMITS.sampleRate,
      durationSeconds: decoded.durationSeconds,
    }

    let result: TranscriptionResult
    try {
      result = await getIpc().invoke('audio:transcribe', request) as TranscriptionResult
    } catch (error) {
      console.error('Transcription failed:', error)
      inscribe(transcriptionFailureMessage(name, 'engine-failed'), { tone: 'danger' })
      return
    }

    if (!result?.ok) {
      inscribe(transcriptionFailureMessage(name, result?.code ?? 'engine-failed'), { tone: 'danger' })
      return
    }

    const canvas = useCanvasStore.getState()
    if (projectSessionRevision() !== originProjectRevision) return
    const board = canvas.boards.find((candidate) => candidate.id === originBoardId)
    if (!board) return
    // The board may have moved on while the recogniser ran, so the transcript is
    // placed against where the audio is now, not where it was when this started.
    // A replaced or deleted source is ignored rather than producing a dangling
    // transcript and connection.
    const audio = board.items.find((candidate) => (
      candidate.id === item.id && candidate.type === 'audio' && candidate.src === originSourcePath
    ))
    if (!audio) return

    const transcript = buildTranscriptItem(audio, result)
    const connection = transcriptSourceConnection(transcript.id, audio.id, canvasColor('accent'))
    const history = useHistoryStore.getState()

    canvas.addItem(originBoardId, transcript)
    history.push('ITEM_ADD', originBoardId, null, transcript)
    canvas.addConnection(originBoardId, connection)
    history.push('CONNECTION_ADD', originBoardId, null, connection)

    // Recorded on the audio itself so a second run is a visible choice rather
    // than an accident, and so export can tell which recordings were read.
    const after = { ...audio.meta, transcriptItemId: transcript.id, transcribedAt: Date.now() }
    canvas.updateItem(originBoardId, audio.id, { meta: after })
    history.push('ITEM_STYLE', originBoardId, { id: audio.id, meta: audio.meta }, { id: audio.id, meta: after })

    // Selection belongs to the active chamber. Avoid leaving an ID from a
    // dormant chamber in the active selection while the user is elsewhere.
    if (canvas.activeBoardId === originBoardId) canvas.setSelection([transcript.id])
    inscribe(transcribedMessage(result))
  } finally {
    useTranscriptionProgressStore.getState().end()
  }
}
