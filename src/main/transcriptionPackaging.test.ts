import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { modelsDirFor } from './transcriptionModels'
import { TRANSCRIPTION_MODELS } from '../types/transcription'

/**
 * Where a transcription model may and may not be.
 *
 * Weights are downloaded on request and live in the user's data folder. They
 * must never travel inside an installer: the smallest is 32 MB and the largest
 * is 190 MB, most people will never transcribe anything, and a model that
 * shipped could not be replaced without shipping again.
 *
 * The packaging config is the thing that would quietly break this, which is why
 * this reads the manifest rather than trusting a comment.
 */
const manifest = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
  build: { extraResources: { from: string; to: string; filter?: string[] }[] }
}

describe('no model ever ships inside the app', () => {
  it('carries only the examples and the engine as extra resources', () => {
    expect(manifest.build.extraResources.map((entry) => entry.from).sort())
      .toEqual(['examples', 'resources/whisper'])
  })

  it('excludes weights from the engine folder, which is the one place they could land', () => {
    // resources/whisper is copied wholesale. A model dropped in there by hand
    // would otherwise be packaged along with the binary beside it.
    const whisper = manifest.build.extraResources.find((entry) => entry.from === 'resources/whisper')
    expect(whisper?.filter).toContain('!*.bin')
  })

  it('keeps weights in the user data folder, which no installer writes to', () => {
    expect(modelsDirFor('/data')).toBe(join('/data', 'models'))
  })
})

describe('where clients fetch a model from', () => {
  it('is one host, over https, with the filename the catalogue names', () => {
    for (const model of TRANSCRIPTION_MODELS) {
      expect(model.url.startsWith('https://')).toBe(true)
      expect(model.url.endsWith(model.filename)).toBe(true)
    }
    const hosts = new Set(TRANSCRIPTION_MODELS.map((model) => new URL(model.url).host))
    expect(hosts.size).toBe(1)
  })

  it('is pinned by digest, so where it is served from cannot change what arrives', () => {
    for (const model of TRANSCRIPTION_MODELS) {
      expect(model.sha256).toMatch(/^[0-9a-f]{64}$/)
    }
  })
})
