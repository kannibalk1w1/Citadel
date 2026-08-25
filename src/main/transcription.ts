import { spawn } from 'child_process'
import { promises as fsp } from 'fs'
import { cpus } from 'os'
import { basename, isAbsolute, join } from 'path'
import {
  MAX_TRANSCRIPTION_BYTES,
  TRANSCRIPTION_LIMITS,
  transcriptionTimeoutMs,
} from '../types/transcription'
import type {
  Transcription,
  TranscriptionEngineState,
  TranscriptionFailure,
  TranscriptionFailureCode,
  TranscriptionProgress,
  TranscriptionRequest,
  TranscriptionResult,
  TranscriptionSegment,
} from '../types/transcription'

/**
 * Speech to text, main process only.
 *
 * Scope is as narrow as the document reader's: decoded samples in, plain text
 * out. The recogniser is whisper.cpp, run as a child process rather than linked
 * as a native addon, which keeps Citadel off the Electron ABI treadmill and
 * makes a timeout an actual kill rather than a race nobody wins.
 *
 * Nothing here reaches the network. The audio never leaves the machine, and the
 * only file written is a temporary wav that is deleted in a `finally`.
 */

/** Bytes per sample. The contract says 16-bit PCM, and the wav header agrees. */
const BYTES_PER_SAMPLE = 2

/**
 * Below this peak the clip is treated as silence rather than fed to the model,
 * which would otherwise spend a minute hallucinating sentences out of hiss.
 * A quarter of a percent of full scale is well under any real speech.
 */
const SILENCE_PEAK = 0.0025

/**
 * A pause long enough to read as a new thought. Whisper hands back sentence-ish
 * segments with no paragraphing of its own, and one unbroken wall of text is
 * unusable on a canvas.
 */
const PARAGRAPH_GAP_SECONDS = 1.5

function fail(code: TranscriptionFailureCode, reason: string): TranscriptionFailure {
  return { ok: false, code, reason }
}

/**
 * A canonical 44-byte PCM wav header wrapped around samples that are already in
 * the shape whisper wants. This is the whole reason Citadel ships no ffmpeg:
 * the renderer's Web Audio decoder did the hard part.
 */
export function encodeWav(pcm: Buffer, sampleRate: number, channels = 1): Buffer {
  const header = Buffer.alloc(44)
  const byteRate = sampleRate * channels * BYTES_PER_SAMPLE

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)          // PCM header length
  header.writeUInt16LE(1, 20)           // format: uncompressed PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(channels * BYTES_PER_SAMPLE, 32)
  header.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)

  return Buffer.concat([header, pcm])
}

/** Loudest sample in the clip, 0 to 1. Used only to tell silence from speech. */
export function peakAmplitude(pcm: Buffer): number {
  let peak = 0
  for (let offset = 0; offset + 1 < pcm.length; offset += BYTES_PER_SAMPLE) {
    const sample = Math.abs(pcm.readInt16LE(offset))
    if (sample > peak) peak = sample
  }
  return peak / 32768
}

/**
 * whisper.cpp reports progress on stderr as `progress = 42%`, mixed in with its
 * own logging. Anything else on that stream is ignored rather than parsed.
 */
export function whisperProgressPercent(line: string): number | null {
  const match = /progress\s*=\s*(\d{1,3})\s*%/.exec(line)
  if (!match) return null
  const percent = Number(match[1])
  return Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null
}

type WhisperJson = {
  result?: { language?: unknown }
  transcription?: unknown
}

/**
 * Reads the `--output-json` file. Offsets are milliseconds from the start of
 * the clip; they are kept as seconds because that is what a person seeking
 * through audio thinks in.
 */
export function parseWhisperJson(raw: string): { segments: TranscriptionSegment[]; language: string } {
  let parsed: WhisperJson
  try {
    parsed = JSON.parse(raw) as WhisperJson
  } catch {
    return { segments: [], language: '' }
  }

  const rows = Array.isArray(parsed.transcription) ? parsed.transcription : []
  const segments = rows.reduce<TranscriptionSegment[]>((kept, row) => {
    if (!row || typeof row !== 'object') return kept
    const entry = row as { offsets?: { from?: unknown; to?: unknown }; text?: unknown }
    const text = typeof entry.text === 'string' ? entry.text.trim() : ''
    if (!text) return kept
    const from = typeof entry.offsets?.from === 'number' ? entry.offsets.from : 0
    const to = typeof entry.offsets?.to === 'number' ? entry.offsets.to : from
    kept.push({ start: from / 1000, end: to / 1000, text })
    return kept
  }, [])

  const language = typeof parsed.result?.language === 'string' ? parsed.result.language : ''
  return { segments, language }
}

/**
 * Segments joined into something readable. A long pause becomes a paragraph
 * break; everything else is one flowing line, because whisper's segment
 * boundaries are breath-shaped rather than meaningful.
 */
export function segmentsToText(segments: TranscriptionSegment[]): string {
  return segments
    .reduce<string[]>((paragraphs, segment, index) => {
      const previous = segments[index - 1]
      const gap = previous ? segment.start - previous.end : 0
      if (!previous || gap >= PARAGRAPH_GAP_SECONDS) paragraphs.push(segment.text)
      else paragraphs[paragraphs.length - 1] = `${paragraphs[paragraphs.length - 1]} ${segment.text}`
      return paragraphs
    }, [])
    .join('\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim()
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/**
 * Where the recogniser lives. A person who already builds whisper.cpp can point
 * at their own copy, which is also the only way to run this on a platform
 * Citadel does not yet ship a binary for.
 */
export function engineFilename(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'
}

export function bundledEnginePath(resourcesDir: string, platform: NodeJS.Platform = process.platform): string {
  return join(resourcesDir, 'whisper', engineFilename(platform))
}

export async function resolveEngine(
  customPath: string | null,
  resourcesDir: string,
  platform: NodeJS.Platform = process.platform,
): Promise<TranscriptionEngineState> {
  const exists = async (path: string): Promise<boolean> => {
    try {
      return (await fsp.stat(path)).isFile()
    } catch {
      return false
    }
  }

  if (customPath && await exists(customPath)) return { source: 'custom', path: customPath }
  const bundled = bundledEnginePath(resourcesDir, platform)
  if (await exists(bundled)) return { source: 'bundled', path: bundled }
  return { source: 'missing', path: null }
}

export type TranscribeDeps = {
  /** Absolute path to the whisper.cpp binary. */
  enginePath: string
  /** Absolute path to the weights. */
  modelPath: string
  modelId: string
  /** Directory for the throwaway wav. */
  tempDir: string
  onProgress?: (progress: TranscriptionProgress) => void
  signal?: AbortSignal
  /** Overridable so tests can drive a stub engine without a real one. */
  spawnEngine?: typeof spawn
}

/**
 * Validation the request has to survive before a process is started. Ordered so
 * a person is told the thing they can act on first: a missing model is fixable
 * in Settings, a silent recording is not fixable at all.
 */
export function validateRequest(request: TranscriptionRequest): TranscriptionFailure | null {
  if (typeof request?.sourcePath !== 'string' || request.sourcePath.trim() === '') {
    return fail('unsupported-source', 'No audio file was given.')
  }
  if (/^[a-z][a-z0-9+.-]+:/i.test(request.sourcePath)) {
    return fail('external-source', 'Citadel transcribes local audio files only.')
  }
  if (!isAbsolute(request.sourcePath)) {
    return fail('external-source', 'Audio must be given as a full local path.')
  }
  if (request.sampleRate !== TRANSCRIPTION_LIMITS.sampleRate) {
    return fail('undecodable', 'The audio was not resampled for transcription.')
  }
  if (!(request.durationSeconds > 0)) {
    return fail('silent', 'That recording has no audio in it.')
  }
  // The duration is what the renderer claims; the payload is what actually
  // arrived. Both are bounded, or a wrong claim becomes an unbounded write.
  if (
    request.durationSeconds > TRANSCRIPTION_LIMITS.maxDurationSeconds
    || (request.samples?.byteLength ?? 0) > MAX_TRANSCRIPTION_BYTES
  ) {
    return fail('too-long', `Citadel transcribes recordings up to ${TRANSCRIPTION_LIMITS.maxDurationSeconds / 60} minutes long.`)
  }
  return null
}

/** Runs the recogniser over one clip. Everything it needs is passed in. */
export async function transcribeAudio(
  request: TranscriptionRequest,
  deps: TranscribeDeps,
): Promise<TranscriptionResult> {
  const invalid = validateRequest(request)
  if (invalid) return invalid

  const pcm = Buffer.from(request.samples)
  if (pcm.length === 0 || peakAmplitude(pcm) < SILENCE_PEAK) {
    return fail('silent', 'That recording is silent, so there is nothing to transcribe.')
  }

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const wavPath = join(deps.tempDir, `citadel-transcribe-${stamp}.wav`)
  const outBase = join(deps.tempDir, `citadel-transcribe-${stamp}`)
  const jsonPath = `${outBase}.json`

  const report = (progress: TranscriptionProgress): void => { deps.onProgress?.(progress) }

  try {
    await fsp.writeFile(wavPath, encodeWav(pcm, request.sampleRate))
  } catch {
    return fail('engine-failed', 'Citadel could not prepare the audio for transcription.')
  }

  try {
    report({ phase: 'loading-model', percent: 0 })
    const run = await runEngine(wavPath, outBase, request, deps, report)
    if (!run.ok) return run

    let raw: string
    try {
      raw = await fsp.readFile(jsonPath, 'utf-8')
    } catch {
      return fail('engine-failed', 'The recogniser finished without writing a transcript.')
    }

    const { segments, language } = parseWhisperJson(raw)
    const text = segmentsToText(segments)
    if (!text) return fail('empty', 'No speech was found in that recording.')

    const transcription: Transcription = {
      ok: true,
      sourcePath: request.sourcePath,
      sourceName: basename(request.sourcePath),
      text,
      segments,
      language: language || request.language || 'en',
      durationSeconds: request.durationSeconds,
      modelId: deps.modelId,
      characters: text.length,
      words: countWords(text),
    }
    report({ phase: 'transcribing', percent: 100 })
    return transcription
  } finally {
    await fsp.rm(wavPath, { force: true }).catch(() => {})
    await fsp.rm(jsonPath, { force: true }).catch(() => {})
  }
}

/**
 * The child process itself. Kept apart from the surrounding bookkeeping so the
 * kill paths (cancelled, timed out, crashed) are all visible in one place.
 */
function runEngine(
  wavPath: string,
  outBase: string,
  request: TranscriptionRequest,
  deps: TranscribeDeps,
  report: (progress: TranscriptionProgress) => void,
): Promise<{ ok: true } | TranscriptionFailure> {
  const threads = Math.max(1, Math.min(8, cpus().length - 1))
  const language = request.language && request.language !== 'auto' ? request.language : 'auto'
  const args = [
    '-m', deps.modelPath,
    '-f', wavPath,
    '-of', outBase,
    '-oj',
    '-pp',
    '-l', language,
    '-t', String(threads),
  ]

  const launch = deps.spawnEngine ?? spawn
  return new Promise((resolve) => {
    // A cancel that arrives while the wav is still being written would
    // otherwise land before anything is listening for it, and the run would
    // continue with nobody left waiting on it.
    if (deps.signal?.aborted) {
      resolve(fail('cancelled', 'Transcription cancelled.'))
      return
    }

    let child: ReturnType<typeof spawn>
    try {
      child = launch(deps.enginePath, args, { windowsHide: true })
    } catch {
      resolve(fail('engine-failed', 'The recogniser could not be started.'))
      return
    }

    // Which kill this was decides which sentence a person reads, so the reason
    // is recorded before the signal rather than guessed from the exit code.
    let ended: TranscriptionFailure | null = null
    const stop = (failure: TranscriptionFailure): void => {
      if (ended) return
      ended = failure
      child.kill()
    }

    const timer = setTimeout(
      () => stop(fail('timeout', 'Transcription took too long, so Citadel stopped it.')),
      transcriptionTimeoutMs(request.durationSeconds),
    )
    timer.unref?.()

    const onAbort = (): void => stop(fail('cancelled', 'Transcription cancelled.'))
    deps.signal?.addEventListener('abort', onAbort, { once: true })

    child.stderr?.on('data', (chunk: Buffer) => {
      const percent = whisperProgressPercent(chunk.toString())
      if (percent !== null) report({ phase: 'transcribing', percent })
    })

    const finish = (result: { ok: true } | TranscriptionFailure): void => {
      clearTimeout(timer)
      deps.signal?.removeEventListener('abort', onAbort)
      resolve(result)
    }

    child.on('error', () => finish(ended ?? fail('engine-missing', 'The transcription engine is not installed.')))
    child.on('close', (code) => {
      if (ended) finish(ended)
      else if (code === 0) finish({ ok: true })
      else finish(fail('engine-failed', 'The recogniser stopped before it finished.'))
    })
  })
}
