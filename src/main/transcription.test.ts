import { EventEmitter } from 'events'
import { mkdtempSync, rmSync, writeFileSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Readable } from 'stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  bundledEnginePath,
  encodeWav,
  engineFilename,
  parseWhisperJson,
  peakAmplitude,
  resolveEngine,
  segmentsToText,
  transcribeAudio,
  validateRequest,
  whisperProgressPercent,
} from './transcription'
import { TRANSCRIPTION_LIMITS } from '../types/transcription'
import type { TranscriptionRequest } from '../types/transcription'

const tempDirs: string[] = []
const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'citadel-transcribe-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** Loud speech-shaped samples, so nothing is mistaken for silence. */
const loudPcm = (samples = 16_000): ArrayBuffer => {
  const pcm = new Int16Array(samples)
  for (let index = 0; index < samples; index++) pcm[index] = index % 2 ? 8000 : -8000
  return pcm.buffer
}

const request = (overrides: Partial<TranscriptionRequest> = {}): TranscriptionRequest => ({
  sourcePath: process.platform === 'win32' ? 'C:\\notes\\voice.m4a' : '/notes/voice.m4a',
  samples: loudPcm(),
  sampleRate: TRANSCRIPTION_LIMITS.sampleRate,
  durationSeconds: 1,
  ...overrides,
})

describe('encodeWav', () => {
  it('writes a canonical 44-byte PCM header around the samples', () => {
    const pcm = Buffer.from(new Int16Array([0, 1, -1, 32767]).buffer)
    const wav = encodeWav(pcm, 16_000)

    expect(wav.subarray(0, 4).toString()).toBe('RIFF')
    expect(wav.subarray(8, 12).toString()).toBe('WAVE')
    expect(wav.subarray(36, 40).toString()).toBe('data')
    expect(wav.readUInt32LE(4)).toBe(36 + pcm.length)
    expect(wav.readUInt16LE(20)).toBe(1)
    expect(wav.readUInt16LE(22)).toBe(1)
    expect(wav.readUInt32LE(24)).toBe(16_000)
    expect(wav.readUInt32LE(28)).toBe(16_000 * 2)
    expect(wav.readUInt16LE(32)).toBe(2)
    expect(wav.readUInt16LE(34)).toBe(16)
    expect(wav.readUInt32LE(40)).toBe(pcm.length)
    expect(wav.length).toBe(44 + pcm.length)
  })
})

describe('peakAmplitude', () => {
  it('is zero for digital silence', () => {
    expect(peakAmplitude(Buffer.alloc(64))).toBe(0)
  })

  it('reads the loudest sample whichever way it points', () => {
    const pcm = Buffer.from(new Int16Array([100, -32768, 20]).buffer)
    expect(peakAmplitude(pcm)).toBe(1)
  })
})

describe('whisperProgressPercent', () => {
  it('reads the percentage out of the engine chatter', () => {
    expect(whisperProgressPercent('whisper_print_progress_callback: progress =  40%')).toBe(40)
  })

  it('ignores every other line', () => {
    expect(whisperProgressPercent('whisper_init_from_file_with_params_no_state: loading model')).toBeNull()
  })

  it('clamps a nonsense percentage rather than passing it on', () => {
    expect(whisperProgressPercent('progress = 400%')).toBe(100)
  })
})

describe('parseWhisperJson', () => {
  const sample = JSON.stringify({
    result: { language: 'en' },
    transcription: [
      { offsets: { from: 0, to: 1500 }, text: ' Remember the arches. ' },
      { offsets: { from: 1500, to: 2400 }, text: 'They face north.' },
      { offsets: { from: 2400, to: 2600 }, text: '   ' },
    ],
  })

  it('keeps offsets as seconds and trims the text', () => {
    const { segments, language } = parseWhisperJson(sample)
    expect(language).toBe('en')
    expect(segments).toEqual([
      { start: 0, end: 1.5, text: 'Remember the arches.' },
      { start: 1.5, end: 2.4, text: 'They face north.' },
    ])
  })

  it('answers with nothing rather than throwing on damaged output', () => {
    expect(parseWhisperJson('{ not json')).toEqual({ segments: [], language: '' })
    expect(parseWhisperJson('{}')).toEqual({ segments: [], language: '' })
  })
})

describe('segmentsToText', () => {
  it('joins segments and breaks a paragraph at a long pause', () => {
    const text = segmentsToText([
      { start: 0, end: 1, text: 'One.' },
      { start: 1.2, end: 2, text: 'Two.' },
      { start: 6, end: 7, text: 'A new thought.' },
    ])
    expect(text).toBe('One. Two.\n\nA new thought.')
  })

  it('is empty for no segments, which is what makes an empty transcript detectable', () => {
    expect(segmentsToText([])).toBe('')
  })
})

describe('validateRequest', () => {
  it('accepts a local, correctly resampled clip', () => {
    expect(validateRequest(request())).toBeNull()
  })

  it('refuses a URL rather than fetching it', () => {
    expect(validateRequest(request({ sourcePath: 'https://example.com/voice.mp3' })))
      .toMatchObject({ code: 'external-source' })
  })

  it('refuses audio that was not resampled for the model', () => {
    expect(validateRequest(request({ sampleRate: 44_100 }))).toMatchObject({ code: 'undecodable' })
  })

  it('refuses a recording longer than the cap', () => {
    expect(validateRequest(request({ durationSeconds: TRANSCRIPTION_LIMITS.maxDurationSeconds + 1 })))
      .toMatchObject({ code: 'too-long' })
  })
})

describe('resolveEngine', () => {
  it('names the binary for the platform it will run on', () => {
    expect(engineFilename('win32')).toBe('whisper-cli.exe')
    expect(engineFilename('linux')).toBe('whisper-cli')
  })

  it('prefers a binary the person chose over the bundled one', async () => {
    const dir = makeTempDir()
    const custom = join(dir, 'my-whisper')
    writeFileSync(custom, '#!/bin/sh\n')
    const bundled = bundledEnginePath(dir)
    expect(await resolveEngine(custom, dir)).toEqual({ source: 'custom', path: custom })
    expect(bundled).toContain('whisper')
  })

  it('reports a missing engine rather than a path that is not there', async () => {
    const dir = makeTempDir()
    expect(await resolveEngine(join(dir, 'gone'), dir)).toEqual({ source: 'missing', path: null })
  })
})

/**
 * A stub standing in for whisper.cpp: it writes the JSON the real binary would
 * write, so the surrounding contract can be tested without a 60 MB model or a
 * compiled recogniser.
 */
function stubEngine(options: {
  json?: string
  exitCode?: number
  stderr?: string[]
  hang?: boolean
} = {}) {
  return vi.fn((_command: string, args: readonly string[]) => {
    const child = new EventEmitter() as EventEmitter & {
      stderr: Readable
      stdout: Readable
      kill: (signal?: string) => boolean
      killed: boolean
    }
    child.stderr = new Readable({ read() {} })
    child.stdout = new Readable({ read() {} })
    child.killed = false
    child.kill = () => {
      child.killed = true
      setImmediate(() => child.emit('close', null))
      return true
    }

    const outBase = args[args.indexOf('-of') + 1]
    setImmediate(() => {
      for (const line of options.stderr ?? []) child.stderr.push(line)
      if (options.hang) return
      if (options.json !== undefined) writeFileSync(`${outBase}.json`, options.json)
      child.emit('close', options.exitCode ?? 0)
    })

    return child as never
  })
}

const deps = (dir: string, spawnEngine: ReturnType<typeof stubEngine>) => ({
  enginePath: join(dir, 'whisper-cli'),
  modelPath: join(dir, 'model.bin'),
  modelId: 'base.en-q5_1',
  tempDir: dir,
  spawnEngine: spawnEngine as never,
})

describe('transcribeAudio', () => {
  const spokenJson = JSON.stringify({
    result: { language: 'en' },
    transcription: [{ offsets: { from: 0, to: 900 }, text: 'Two words' }],
  })

  it('returns the transcript and counts what it found', async () => {
    const dir = makeTempDir()
    const result = await transcribeAudio(request(), deps(dir, stubEngine({ json: spokenJson })))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).toBe('Two words')
    expect(result.words).toBe(2)
    expect(result.characters).toBe(9)
    expect(result.language).toBe('en')
    expect(result.modelId).toBe('base.en-q5_1')
    expect(result.segments).toHaveLength(1)
  })

  it('deletes the wav and the json it wrote, whatever happened', async () => {
    const dir = makeTempDir()
    await transcribeAudio(request(), deps(dir, stubEngine({ json: spokenJson })))
    expect(readdirSync(dir)).toEqual([])
  })

  it('refuses a silent clip before starting a process', async () => {
    const dir = makeTempDir()
    const spawnEngine = stubEngine({ json: spokenJson })
    const result = await transcribeAudio(
      request({ samples: new Int16Array(16_000).buffer }),
      deps(dir, spawnEngine),
    )

    expect(result).toMatchObject({ ok: false, code: 'silent' })
    expect(spawnEngine).not.toHaveBeenCalled()
  })

  it('reports an engine that stopped early rather than an empty transcript', async () => {
    const dir = makeTempDir()
    const result = await transcribeAudio(request(), deps(dir, stubEngine({ exitCode: 1 })))
    expect(result).toMatchObject({ ok: false, code: 'engine-failed' })
  })

  it('says no speech was found when the engine finds none', async () => {
    const dir = makeTempDir()
    const empty = JSON.stringify({ result: { language: 'en' }, transcription: [] })
    const result = await transcribeAudio(request(), deps(dir, stubEngine({ json: empty })))
    expect(result).toMatchObject({ ok: false, code: 'empty' })
  })

  it('passes engine progress on as a percentage', async () => {
    const dir = makeTempDir()
    const seen: number[] = []
    await transcribeAudio(request(), {
      ...deps(dir, stubEngine({ json: spokenJson, stderr: ['progress =  25%\n', 'progress =  75%\n'] })),
      onProgress: (progress) => { seen.push(progress.percent) },
    })
    expect(seen).toContain(25)
    expect(seen).toContain(75)
  })

  it('kills the recogniser when the run is cancelled, and says so', async () => {
    const dir = makeTempDir()
    const controller = new AbortController()
    const spawnEngine = stubEngine({ hang: true })
    const pending = transcribeAudio(request(), { ...deps(dir, spawnEngine), signal: controller.signal })

    // Abort only once the engine is actually running, which is the case the
    // kill path is for. The pre-spawn race has its own test below.
    while (spawnEngine.mock.calls.length === 0) await new Promise((resolve) => setImmediate(resolve))
    controller.abort()

    expect(await pending).toMatchObject({ ok: false, code: 'cancelled' })
  })

  it('answers cancelled when the run was aborted before the engine started', async () => {
    const dir = makeTempDir()
    const controller = new AbortController()
    controller.abort()
    const spawnEngine = stubEngine({ hang: true })

    const result = await transcribeAudio(request(), { ...deps(dir, spawnEngine), signal: controller.signal })

    expect(result).toMatchObject({ ok: false, code: 'cancelled' })
    expect(spawnEngine).not.toHaveBeenCalled()
  })
})
