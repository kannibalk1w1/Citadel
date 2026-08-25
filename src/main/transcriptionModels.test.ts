import { createHash } from 'crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Readable } from 'stream'
import { afterEach, describe, expect, it } from 'vitest'
import {
  abortModelDownload,
  downloadModel,
  listInstalledModels,
  modelFilePath,
  modelsDirFor,
  readModelChoice,
  removeModel,
  resolveModelFile,
} from './transcriptionModels'
import { TRANSCRIPTION_MODELS, TRANSCRIPTION_SETTINGS_KEYS } from '../types/transcription'

const tempDirs: string[] = []
const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'citadel-models-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const [firstModel] = TRANSCRIPTION_MODELS

describe('the catalogue', () => {
  it('pins a digest and a size for every entry, or a download cannot be verified', () => {
    for (const model of TRANSCRIPTION_MODELS) {
      expect(model.sha256).toMatch(/^[0-9a-f]{64}$/)
      expect(model.bytes).toBeGreaterThan(0)
      expect(model.url).toMatch(/^https:\/\//)
      expect(model.url.endsWith(model.filename)).toBe(true)
    }
  })

  it('gives every entry its own id and filename', () => {
    const ids = new Set(TRANSCRIPTION_MODELS.map((model) => model.id))
    const files = new Set(TRANSCRIPTION_MODELS.map((model) => model.filename))
    expect(ids.size).toBe(TRANSCRIPTION_MODELS.length)
    expect(files.size).toBe(TRANSCRIPTION_MODELS.length)
  })
})

describe('readModelChoice', () => {
  it('reads what Settings recorded', () => {
    expect(readModelChoice({
      [TRANSCRIPTION_SETTINGS_KEYS.managedId]: firstModel.id,
      [TRANSCRIPTION_SETTINGS_KEYS.customPath]: '/models/mine.bin',
    })).toEqual({ managedId: firstModel.id, customPath: '/models/mine.bin' })
  })

  it('treats a blank or unknown value as no choice at all', () => {
    expect(readModelChoice({})).toEqual({ managedId: null, customPath: null })
    expect(readModelChoice({
      [TRANSCRIPTION_SETTINGS_KEYS.managedId]: 'a-model-that-was-removed',
      [TRANSCRIPTION_SETTINGS_KEYS.customPath]: '   ',
    })).toEqual({ managedId: null, customPath: null })
  })
})

describe('resolveModelFile', () => {
  it('says no model is installed when nothing has been chosen', async () => {
    const dir = makeTempDir()
    expect(await resolveModelFile(dir, { managedId: null, customPath: null }))
      .toMatchObject({ ok: false, code: 'no-model' })
  })

  it('prefers a file the person chose over a managed download', async () => {
    const dir = makeTempDir()
    const mine = join(dir, 'mine.bin')
    writeFileSync(mine, 'weights')
    writeFileSync(modelFilePath(dir, firstModel), 'weights')

    expect(await resolveModelFile(dir, { managedId: firstModel.id, customPath: mine }))
      .toMatchObject({ ok: true, path: mine })
  })

  it('reports a chosen file that has moved rather than falling back silently', async () => {
    const dir = makeTempDir()
    writeFileSync(modelFilePath(dir, firstModel), 'weights')

    expect(await resolveModelFile(dir, { managedId: firstModel.id, customPath: join(dir, 'gone.bin') }))
      .toMatchObject({ ok: false, code: 'model-missing' })
  })

  it('reports a managed model whose file is missing', async () => {
    const dir = makeTempDir()
    expect(await resolveModelFile(dir, { managedId: firstModel.id, customPath: null }))
      .toMatchObject({ ok: false, code: 'model-missing' })
  })
})

describe('listInstalledModels', () => {
  it('reports what is on disk, with its size', async () => {
    const dir = makeTempDir()
    writeFileSync(modelFilePath(dir, firstModel), 'weights')

    const { states } = await listInstalledModels(dir, {})
    const state = states.find((entry) => entry.id === firstModel.id)

    expect(state).toMatchObject({ installed: true, bytes: 7 })
    expect(states).toHaveLength(TRANSCRIPTION_MODELS.length)
    expect(states.filter((entry) => entry.installed)).toHaveLength(1)
  })
})

describe('removeModel', () => {
  it('deletes the file it manages', async () => {
    const dir = makeTempDir()
    const path = modelFilePath(dir, firstModel)
    writeFileSync(path, 'weights')

    expect(await removeModel(dir, firstModel.id)).toEqual({ ok: true })
    expect(existsSync(path)).toBe(false)
  })

  it('refuses an id that is not in the catalogue', async () => {
    const dir = makeTempDir()
    expect(await removeModel(dir, '../../etc/passwd')).toMatchObject({ ok: false })
  })
})

/** A stand-in for the download, so the verify-then-install path needs no network. */
const streamOf = (body: string) => async () => ({
  stream: Readable.from([Buffer.from(body)]) as NodeJS.ReadableStream,
  totalBytes: Buffer.byteLength(body),
})

describe('downloadModel', () => {
  it('installs only what matches the pinned digest', async () => {
    const dir = makeTempDir()
    const body = 'pretend weights'
    const model = { ...firstModel, sha256: createHash('sha256').update(body).digest('hex') }
    // The catalogue is the authority, so the test pins the same digest onto it.
    const original = firstModel.sha256
    Object.assign(firstModel, { sha256: model.sha256 })

    try {
      const result = await downloadModel(dir, firstModel.id, { openStream: streamOf(body) })
      expect(result).toEqual({ ok: true, bytes: Buffer.byteLength(body) })
      expect(readFileSync(modelFilePath(dir, firstModel), 'utf-8')).toBe(body)
    } finally {
      Object.assign(firstModel, { sha256: original })
    }
  })

  it('discards a download that does not match, leaving nothing installed', async () => {
    const dir = makeTempDir()
    const result = await downloadModel(dir, firstModel.id, { openStream: streamOf('not the weights') })

    expect(result).toMatchObject({ ok: false })
    if (result.ok) return
    expect(result.reason).toContain('checksum')
    expect(existsSync(modelFilePath(dir, firstModel))).toBe(false)
    expect(existsSync(`${modelFilePath(dir, firstModel)}.part`)).toBe(false)
  })

  it('reports a server that did not answer with the file', async () => {
    const dir = makeTempDir()
    const result = await downloadModel(dir, firstModel.id, {
      openStream: async () => { throw new Error('The download server answered 404.') },
    })

    expect(result).toMatchObject({ ok: false, reason: 'The download server answered 404.' })
    expect(existsSync(modelFilePath(dir, firstModel))).toBe(false)
  })

  it('refuses an id it does not manage rather than writing somewhere unexpected', async () => {
    const dir = makeTempDir()
    expect(await downloadModel(dir, 'not-a-model', { openStream: streamOf('x') })).toMatchObject({ ok: false })
  })

  it('leaves nothing behind when a download is cancelled', async () => {
    const dir = makeTempDir()
    const stream = new Readable({ read() {} })
    stream.push(Buffer.from('half of the '))

    const pending = downloadModel(dir, firstModel.id, {
      openStream: async () => ({ stream: stream as NodeJS.ReadableStream, totalBytes: 999 }),
      onProgress: () => { abortModelDownload(firstModel.id) },
    })

    expect(await pending).toMatchObject({ ok: false, reason: 'Download cancelled.' })
    expect(existsSync(`${modelFilePath(dir, firstModel)}.part`)).toBe(false)
    expect(existsSync(modelFilePath(dir, firstModel))).toBe(false)
  })

  it('reports progress as it goes', async () => {
    const dir = makeTempDir()
    const seen: number[] = []
    await downloadModel(dir, firstModel.id, {
      openStream: streamOf('not the weights'),
      onProgress: (progress) => { seen.push(progress.percent) },
    })
    expect(seen.length).toBeGreaterThan(0)
    expect(seen[seen.length - 1]).toBe(100)
  })
})

describe('modelsDirFor', () => {
  it('keeps weights in userData, never in the read-only install directory', () => {
    expect(modelsDirFor(join('C:', 'Users', 'x', 'AppData', 'Roaming', 'Citadel')))
      .toBe(join('C:', 'Users', 'x', 'AppData', 'Roaming', 'Citadel', 'models'))
  })
})
