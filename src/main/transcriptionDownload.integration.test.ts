import { mkdtempSync, rmSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { downloadModel, modelFilePath } from './transcriptionModels'
import { TRANSCRIPTION_MODELS } from '../types/transcription'

/**
 * The one test that really downloads a model.
 *
 * Every other download test injects a stream, which proves the verify-then-
 * install path but not the URL, the release, or the redirect GitHub answers
 * with. Those are the parts that break when weights move host. It runs only
 * when asked, so a normal `vitest run` stays offline:
 *
 *   CITADEL_MODEL_DOWNLOAD=1 npx vitest run src/main/transcriptionDownload.integration.test.ts
 *
 * Run it after changing MODEL_RELEASE_URL, and after publishing a new models
 * release. It fetches the smallest model, which is about 32 MB.
 */
const enabled = process.env.CITADEL_MODEL_DOWNLOAD === '1'
const [smallest] = TRANSCRIPTION_MODELS

const tempDirs: string[] = []
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe.skipIf(!enabled)('the published models release', () => {
  it('serves a model that matches its pinned digest', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'citadel-model-'))
    tempDirs.push(dir)
    const seen: number[] = []

    const result = await downloadModel(dir, smallest.id, {
      onProgress: (progress) => { seen.push(progress.percent) },
    })

    // A mismatch would have deleted the file rather than installing it, so
    // reaching ok:true is the digest check passing against the real bytes.
    expect(result).toEqual({ ok: true, bytes: smallest.bytes })
    expect(statSync(modelFilePath(dir, smallest)).size).toBe(smallest.bytes)
    expect(seen[seen.length - 1]).toBe(100)
  }, 600_000)
})
