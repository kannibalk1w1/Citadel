/**
 * The `audio:transcribe` wire contract.
 *
 * Kept in `src/types` and compiled by both the main and renderer projects for
 * the same reason the document contract is: the main process is the only side
 * that runs the recogniser, the renderer is the only side that turns a reason
 * into a sentence a person sees, and two copies of that vocabulary would
 * eventually disagree.
 *
 * Transcription is local and offline. Audio is never uploaded, and the only
 * network request the feature ever makes is an explicit, hash-checked model
 * download the person asks for in Settings.
 */

/**
 * The bounds a transcription is held to. Whisper is trained on 16 kHz mono, so
 * the sample rate is a requirement rather than a preference: the renderer
 * resamples to it before sending, and main refuses anything else instead of
 * quietly transcribing chipmunks.
 */
export const TRANSCRIPTION_LIMITS = {
  /** Hz. Not configurable. The model was trained here. */
  sampleRate: 16_000,
  /** A voice note, not a podcast. Longer audio is refused, not truncated. */
  maxDurationSeconds: 20 * 60,
  /** Floor for short clips, where process startup dominates. */
  minTimeoutMs: 60_000,
  /**
   * Wall-clock allowed per second of audio. Base on a modern CPU runs several
   * times faster than real time; this leaves room for a slow laptop without
   * letting a wedged process hold a person's canvas forever.
   */
  timeoutPerAudioSecond: 4,
} as const

/** Total bytes of PCM a request may carry, derived so no second number can drift. */
export const MAX_TRANSCRIPTION_BYTES =
  TRANSCRIPTION_LIMITS.sampleRate * TRANSCRIPTION_LIMITS.maxDurationSeconds * 2

/** How long main will wait on this particular clip before killing the recogniser. */
export function transcriptionTimeoutMs(durationSeconds: number): number {
  const scaled = Math.ceil(durationSeconds) * TRANSCRIPTION_LIMITS.timeoutPerAudioSecond * 1000
  return Math.max(TRANSCRIPTION_LIMITS.minTimeoutMs, scaled)
}

/**
 * What the renderer will attempt to decode. Decoding happens in the renderer
 * through Web Audio, which is why there is no ffmpeg here and no codec list in
 * the main process: this table is only used to decide whether to offer the
 * action at all, so the menu and the drop handler give the same answer.
 */
export const TRANSCRIBABLE_EXTENSIONS = [
  'mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus', 'webm',
] as const

export function isTranscribableFilename(filename: string): boolean {
  const extension = filename.split(/[\\/]/).pop()?.split('.').pop()?.toLowerCase() ?? ''
  return (TRANSCRIBABLE_EXTENSIONS as readonly string[]).includes(extension)
}

// ── Models ───────────────────────────────────────────────────────────────────

/**
 * A model Citadel offers to fetch. Nothing here ships inside the installer:
 * bundling even the smallest weights would double the portable .exe, so the
 * catalogue is a list of things a person may choose to download once.
 */
export type TranscriptionModel = {
  id: string
  /** Shown in Settings. Plain words, no model-zoo jargon. */
  label: string
  /** One line on what the trade is, so the choice can be made without a benchmark. */
  note: string
  /** For the download URL. */
  filename: string
  url: string
  /** Exact size of the published file, used for the progress bar and the label. */
  bytes: number
  /**
   * Pinned SHA-256 of the published file. The download is refused unless what
   * arrived hashes to this, so a mirror, a proxy, or a truncated transfer
   * cannot leave unverified weights installed.
   */
  sha256: string
  /** English-only weights are smaller and better at English. */
  englishOnly: boolean
}

/** Where Citadel serves weights from: its own release, so a download does not
 * depend on a third party staying up, and so the files behind these digests
 * cannot be replaced by anyone else. Versioned apart from the app: it changes
 * only when a model is added or replaced. */
export const MODEL_RELEASE_URL = 'https://github.com/kannibalk1w1/Citadel/releases/download/models-v1'

/**
 * Quantised whisper.cpp weights, redistributed unmodified under MIT. Three
 * entries only: a fast one, a default, and one for difficult audio. A longer
 * list is a worse decision, not a better one.
 */
export const TRANSCRIPTION_MODELS: readonly TranscriptionModel[] = [
  {
    id: 'tiny.en-q5_1',
    label: 'Fast',
    note: 'Quickest, and the least accurate on accents or background noise.',
    filename: 'ggml-tiny.en-q5_1.bin',
    url: `${MODEL_RELEASE_URL}/ggml-tiny.en-q5_1.bin`,
    bytes: 32_166_155,
    sha256: 'c77c5766f1cef09b6b7d47f21b546cbddd4157886b3b5d6d4f709e91e66c7c2b',
    englishOnly: true,
  },
  {
    id: 'base.en-q5_1',
    label: 'Balanced',
    note: 'The sensible default for a spoken note. Faster than real time on most machines.',
    filename: 'ggml-base.en-q5_1.bin',
    url: `${MODEL_RELEASE_URL}/ggml-base.en-q5_1.bin`,
    bytes: 59_721_011,
    sha256: '4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f',
    englishOnly: true,
  },
  {
    id: 'small-q5_1',
    label: 'Careful',
    note: 'Best on noisy or accented speech, and handles languages other than English. Roughly real time.',
    filename: 'ggml-small-q5_1.bin',
    url: `${MODEL_RELEASE_URL}/ggml-small-q5_1.bin`,
    bytes: 190_085_487,
    sha256: 'ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb',
    englishOnly: false,
  },
]

export function findTranscriptionModel(id: string): TranscriptionModel | null {
  return TRANSCRIPTION_MODELS.find((model) => model.id === id) ?? null
}

/**
 * Which weights to use. A person may let Citadel manage the file or point at a
 * `.bin` they already have, and someone who already keeps whisper models should
 * not be made to download a second copy.
 */
export type TranscriptionModelChoice = {
  /** A `TRANSCRIPTION_MODELS` id Citadel downloaded, or null if none is installed. */
  managedId: string | null
  /** A full local path the person chose. Wins over `managedId` when set. */
  customPath: string | null
}

/** Where the recogniser itself came from, which Settings has to be able to say. */
export type TranscriptionEngineSource = 'bundled' | 'custom' | 'missing'

export type TranscriptionEngineState = {
  source: TranscriptionEngineSource
  path: string | null
}

export const EMPTY_MODEL_CHOICE: TranscriptionModelChoice = { managedId: null, customPath: null }

/** Settings keys, named here so main and the panel cannot spell them differently. */
export const TRANSCRIPTION_SETTINGS_KEYS = {
  managedId: 'transcription.managedModelId',
  customPath: 'transcription.customModelPath',
  /**
   * A whisper.cpp binary the person points at, for anyone who already has one
   * built. Empty means use the copy that ships with Citadel.
   */
  enginePath: 'transcription.enginePath',
  /** Kept so a second transcription does not re-ask a question already answered. */
  language: 'transcription.language',
} as const

/** What Settings shows about one catalogue entry. */
export type ModelInstallState = {
  id: string
  installed: boolean
  /** Bytes on disk, once installed. */
  bytes?: number
  downloading?: boolean
}

/** Pushed on `transcribe:downloadProgress` while weights are being fetched. */
export type ModelDownloadProgress = {
  id: string
  receivedBytes: number
  totalBytes: number
  percent: number
}

// ── Transcribing ─────────────────────────────────────────────────────────────

/**
 * What the renderer hands over. The audio arrives already decoded because the
 * renderer has Web Audio and the main process has no codecs: an
 * `OfflineAudioContext` at 16 kHz turns mp3, m4a, ogg and the rest into samples,
 * which saves shipping ffmpeg for a job the platform already does.
 */
export type TranscriptionRequest = {
  /** The relic's own path. Read only for its name and for the failure sentence. */
  sourcePath: string
  /** 16-bit signed little-endian PCM, mono, at `TRANSCRIPTION_LIMITS.sampleRate`. */
  samples: ArrayBuffer
  sampleRate: number
  durationSeconds: number
  /** ISO 639-1, or 'auto'. Ignored by English-only weights. */
  language?: string
}

/**
 * Timestamps ride along so a transcript can later be clicked back to a moment in
 * the audio. Nothing uses that yet; dropping the data now would mean re-running
 * every transcription to get it back.
 */
export type TranscriptionSegment = {
  /** Seconds from the start of the clip. */
  start: number
  end: number
  text: string
}

export type TranscriptionFailureCode =
  /** No weights installed at all. The fix is one button in Settings. */
  | 'no-model'
  /** A chosen model file that is no longer where it was. */
  | 'model-missing'
  /** The recogniser itself is absent from the install, which is a packaging bug. */
  | 'engine-missing'
  | 'unsupported-source'
  | 'external-source'
  | 'too-long'
  /** Raised renderer-side: Web Audio could not decode the file. */
  | 'undecodable'
  /** Decoded fine, but there is nothing to hear. */
  | 'silent'
  /** Ran, and found no words in the audio. */
  | 'empty'
  | 'engine-failed'
  | 'timeout'
  | 'cancelled'

export type Transcription = {
  ok: true
  /** The audio's own path, unchanged. Citadel never writes to it. */
  sourcePath: string
  sourceName: string
  text: string
  segments: TranscriptionSegment[]
  /** What the model decided it heard, or the language it was told to assume. */
  language: string
  durationSeconds: number
  /** Which weights produced this, so a transcript can be judged later. */
  modelId: string
  characters: number
  words: number
}

export type TranscriptionFailure = {
  ok: false
  code: TranscriptionFailureCode
  reason: string
}

export type TranscriptionResult = Transcription | TranscriptionFailure

/**
 * Pushed on `transcribe:progress`. Loading weights off a cold disk is slow
 * enough to look like a hang on its own, so the phase is reported and not just
 * a percentage that sits at zero.
 */
export type TranscriptionProgress = {
  phase: 'decoding' | 'loading-model' | 'transcribing'
  percent: number
}
