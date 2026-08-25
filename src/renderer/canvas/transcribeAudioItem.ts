import type { CanvasItem } from '../../types'
import { TRANSCRIPTION_LIMITS } from '../../types/transcription'
import type { TranscriptionRequest, TranscriptionResult } from '../../types/transcription'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { canvasColor } from '../theme/canvasColors'
import { inscribe } from '../ui/toasts/inscriptionToastStore'
import { useTranscriptionProgressStore } from '../ui/transcriptionProgressStore'
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
    const boardId = canvas.activeBoardId
    if (!boardId) return
    // The board may have moved on while the recogniser ran, so the transcript is
    // placed against where the audio is now, not where it was when this started.
    const audio = canvas.items().find((candidate) => candidate.id === item.id)
    if (!audio) return

    const transcript = buildTranscriptItem(audio, result)
    const connection = transcriptSourceConnection(transcript.id, audio.id, canvasColor('accent'))
    const history = useHistoryStore.getState()

    canvas.addItem(boardId, transcript)
    history.push('ITEM_ADD', boardId, null, transcript)
    canvas.addConnection(boardId, connection)
    history.push('CONNECTION_ADD', boardId, null, connection)

    // Recorded on the audio itself so a second run is a visible choice rather
    // than an accident, and so export can tell which recordings were read.
    const after = { ...audio.meta, transcriptItemId: transcript.id, transcribedAt: Date.now() }
    canvas.updateItem(boardId, audio.id, { meta: after })
    history.push('ITEM_STYLE', boardId, { id: audio.id, meta: audio.meta }, { id: audio.id, meta: after })

    canvas.setSelection([transcript.id])
    inscribe(transcribedMessage(result))
  } finally {
    useTranscriptionProgressStore.getState().end()
  }
}
