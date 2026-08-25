import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { transcribeAudio } from './transcription'
import { TRANSCRIPTION_LIMITS } from '../types/transcription'

/**
 * The one test that runs the real recogniser.
 *
 * Everything else stubs the child process, which proves the contract around it
 * but not the flags, the JSON shape, or the progress format — all of which are
 * whisper.cpp's to change. This runs only when pointed at a real binary and
 * model, so a normal `vitest run` is unaffected:
 *
 *   CITADEL_WHISPER_BIN=…/whisper-cli \
 *   CITADEL_WHISPER_MODEL=…/ggml-tiny.en-q5_1.bin \
 *   CITADEL_WHISPER_WAV=…/samples/jfk.wav \
 *   npx vitest run src/main/transcriptionEngine.integration.test.ts
 *
 * The wav must be 16 kHz mono 16-bit, which is what the renderer's decoder
 * produces and what the samples in the whisper.cpp repo already are.
 */

const enginePath = process.env.CITADEL_WHISPER_BIN
const modelPath = process.env.CITADEL_WHISPER_MODEL
const wavPath = process.env.CITADEL_WHISPER_WAV
const configured = Boolean(enginePath && modelPath && wavPath)

const tempDirs: string[] = []
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** Samples out of a canonical wav, which is all the 44-byte header allows. */
function pcmFromWav(path: string): { samples: ArrayBuffer; durationSeconds: number } {
  const wav = readFileSync(path)
  const pcm = wav.subarray(44)
  const copy = new Uint8Array(pcm.length)
  copy.set(pcm)
  return {
    samples: copy.buffer,
    durationSeconds: pcm.length / 2 / TRANSCRIPTION_LIMITS.sampleRate,
  }
}

describe.skipIf(!configured)('the real whisper.cpp binary', () => {
  it('answers with the words that were spoken, and reports progress on the way', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'citadel-whisper-'))
    tempDirs.push(dir)
    const { samples, durationSeconds } = pcmFromWav(wavPath!)
    const percents: number[] = []

    const result = await transcribeAudio(
      { sourcePath: wavPath!, samples, sampleRate: TRANSCRIPTION_LIMITS.sampleRate, durationSeconds },
      {
        enginePath: enginePath!,
        modelPath: modelPath!,
        modelId: 'integration',
        tempDir: dir,
        onProgress: (progress) => { percents.push(progress.percent) },
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text.toLowerCase()).toContain('country')
    expect(result.words).toBeGreaterThan(3)
    expect(result.segments[0].end).toBeGreaterThan(result.segments[0].start)
    expect(result.language).toBe('en')
    // The engine's own progress lines were parsed, not just the closing 100.
    expect(percents).toContain(100)
  }, 120_000)
})
