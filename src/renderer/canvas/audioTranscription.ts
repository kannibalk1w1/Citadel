import { nanoid } from 'nanoid'
import type { CanvasItem, Connection } from '../../types'
import {
  TRANSCRIPTION_LIMITS,
  isTranscribableFilename,
} from '../../types/transcription'
import type {
  Transcription,
  TranscriptionFailure,
  TranscriptionFailureCode,
} from '../../types/transcription'
import { DOCUMENT_ITEM_LAYOUT, documentItemHeight } from './documentImport'
import { isLocalSourcePath, pathToUrl } from '../utils/pathToUrl'

/**
 * Turning a voice note into an ordinary canvas text item.
 *
 * Nothing here runs a recogniser: the main process does that over
 * `audio:transcribe` and answers with either words or a named reason. What this
 * side does own is the decoding, because the renderer is where the codecs are.
 * A dropped .m4a is decoded to the 16 kHz mono samples whisper expects, which is
 * the reason Citadel ships no ffmpeg for a job the platform already does.
 *
 * What lands on the canvas is a plain `text` item, the same one the text tool
 * makes, connected back to the audio it came from. Search, export, undo, and
 * saving need no transcript-specific code anywhere else.
 *
 * Nothing here fetches anything remote. `pathToUrl` passes a URL straight
 * through, so an item whose `src` is an address rather than a path would have
 * been fetched by the decoder before the main process ever saw the request. A
 * shared project could then make Citadel call out on a right-click, which is
 * not a promise this feature is allowed to break, so the source is checked here
 * as well as on the other side of the bridge.
 */

// The local-path rule lives beside `pathToUrl`, whose pass-through is the
// hazard it guards. The main process holds the same line in `validateRequest`;
// this is the copy that runs before anything is read.
export { isLocalSourcePath, isTranscribableFilename }

/** A transcript sits beside its recording rather than on top of it. */
export const TRANSCRIPT_GAP = 32

export type DecodedAudio = {
  ok: true
  /** 16-bit signed little-endian PCM, mono, at the contract's sample rate. */
  samples: ArrayBuffer
  durationSeconds: number
}

/**
 * Float samples as the contract's 16-bit PCM. Rounding rather than truncating
 * keeps a quiet recording from drifting toward silence, and the asymmetric
 * clamp is the one 16-bit signed audio actually has.
 */
export function pcm16FromFloat(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length)
  for (let index = 0; index < input.length; index++) {
    const sample = Math.max(-1, Math.min(1, input[index]))
    output[index] = Math.round(sample < 0 ? sample * 32768 : sample * 32767)
  }
  return output.buffer
}

type OfflineContextFactory = (channels: number, frames: number, sampleRate: number) => OfflineAudioContext

const defaultOfflineContext: OfflineContextFactory = (channels, frames, sampleRate) => (
  new OfflineAudioContext(channels, frames, sampleRate)
)

/**
 * Read the file the way the audio item already reads it, then resample it to
 * what the model was trained on. Stereo is mixed down by the render itself, so
 * neither channel is simply thrown away.
 */
export async function decodeAudioToPcm16(
  src: string,
  createContext: OfflineContextFactory = defaultOfflineContext,
): Promise<DecodedAudio | TranscriptionFailure> {
  const { sampleRate, maxDurationSeconds } = TRANSCRIPTION_LIMITS

  // Refused before the fetch, not after: this is the check that keeps a
  // transcription from reaching the network at all.
  if (!isLocalSourcePath(src)) {
    return {
      ok: false,
      code: 'external-source',
      reason: 'Citadel transcribes local audio files only. It will not fetch audio in order to transcribe it.',
    }
  }

  let decoded: AudioBuffer
  try {
    const response = await fetch(pathToUrl(src))
    const encoded = await response.arrayBuffer()
    // A one-frame context is only a decoder here; the resampling pass follows.
    decoded = await createContext(1, 1, sampleRate).decodeAudioData(encoded)
  } catch {
    return {
      ok: false,
      code: 'undecodable',
      reason: 'That audio file could not be read. It may be damaged or in a format this system has no decoder for.',
    }
  }

  if (!(decoded.duration > 0)) {
    return { ok: false, code: 'silent', reason: 'That recording has no audio in it.' }
  }
  // Checked before the render, so an hour-long file is refused rather than
  // resampled into memory first.
  if (decoded.duration > maxDurationSeconds) {
    return {
      ok: false,
      code: 'too-long',
      reason: `Citadel transcribes recordings up to ${maxDurationSeconds / 60} minutes long, and this one is longer.`,
    }
  }

  const frames = Math.max(1, Math.ceil(decoded.duration * sampleRate))
  const offline = createContext(1, frames, sampleRate)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()

  return {
    ok: true,
    samples: pcm16FromFloat(rendered.getChannelData(0)),
    durationSeconds: decoded.duration,
  }
}

export type TranscriptPlacement = {
  id?: string
  zIndex?: number
}

/** The transcript as an ordinary text item, placed to the right of its audio. */
export function buildTranscriptItem(
  audio: CanvasItem,
  transcription: Transcription,
  placement: TranscriptPlacement = {},
): CanvasItem {
  const width = DOCUMENT_ITEM_LAYOUT.width
  const height = documentItemHeight(transcription.text)

  return {
    id: placement.id ?? nanoid(),
    type: 'text',
    x: audio.x + audio.width + TRANSCRIPT_GAP,
    y: audio.y,
    width,
    height,
    rotation: 0,
    zIndex: placement.zIndex ?? Date.now(),
    locked: false,
    visible: true,
    opacity: 1,
    tags: [],
    // The recording itself, still where its owner keeps it.
    src: transcription.sourcePath,
    meta: {
      content: transcription.text,
      // No colour is stored, so a transcript follows a theme change like any
      // other text item.
      fontSize: DOCUMENT_ITEM_LAYOUT.fontSize,
      align: 'left',
      transcriptOf: transcription.sourcePath,
      transcriptName: transcription.sourceName,
      transcriptModel: transcription.modelId,
      transcriptLanguage: transcription.language,
      transcriptWords: transcription.words,
      transcriptDurationSeconds: transcription.durationSeconds,
      // Kept so a transcript can later be clicked back to a moment in the
      // audio. Re-running the recogniser is the only other way to get these.
      transcriptSegments: transcription.segments,
    },
  }
}

export function transcriptSourceConnection(
  transcriptId: string,
  audioId: string,
  color: string,
  id = nanoid(),
): Connection {
  return {
    id,
    fromId: transcriptId,
    toId: audioId,
    fromAnchor: 'auto',
    toAnchor: 'auto',
    style: 'bezier',
    color,
    width: 1.5,
    arrowHead: 'arrow',
    meaning: 'source',
    dashed: false,
  }
}

/** Minutes and seconds, for a sentence rather than a timeline. */
export function formatClipLength(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(whole / 60)
  return minutes > 0 ? `${minutes}m ${String(whole % 60).padStart(2, '0')}s` : `${whole}s`
}

export function transcribedMessage(transcription: Transcription): string {
  const words = transcription.words === 1 ? '1 word' : `${transcription.words} words`
  return `${transcription.sourceName} transcribed: ${words} from ${formatClipLength(transcription.durationSeconds)}`
}

/**
 * One sentence per reason, each naming the file and, where there is one, the
 * step that would actually fix it. A transcription never stops without one.
 */
export function transcriptionFailureMessage(filename: string, code: TranscriptionFailureCode): string {
  switch (code) {
    case 'no-model':
      return 'No transcription model is installed. Settings can download one, or point Citadel at a model file you already have.'
    case 'model-missing':
      return 'The transcription model is no longer where Citadel left it. Choose or download one again in Settings.'
    case 'engine-missing':
      return 'The transcription engine is missing from this install. Settings can point Citadel at a whisper.cpp binary.'
    case 'unsupported-source':
      return `${filename} has no audio file behind it, so there was nothing to transcribe.`
    case 'external-source':
      return `${filename} is a link rather than a local file. Citadel will not fetch audio in order to transcribe it.`
    case 'too-long':
      return `${filename} is longer than ${TRANSCRIPTION_LIMITS.maxDurationSeconds / 60} minutes, so Citadel did not transcribe it.`
    case 'undecodable':
      return `${filename} could not be decoded. It may be damaged or in a format this system has no decoder for.`
    case 'silent':
      return `${filename} is silent, so there is nothing to transcribe.`
    case 'empty':
      return `No speech was found in ${filename}.`
    case 'timeout':
      return `${filename} took too long to transcribe, so Citadel stopped. A smaller model in Settings will be faster.`
    case 'cancelled':
      return `Transcription of ${filename} cancelled.`
    case 'engine-failed':
      return `${filename} could not be transcribed. The recogniser stopped before it finished.`
    default:
      return `${filename} could not be transcribed.`
  }
}
