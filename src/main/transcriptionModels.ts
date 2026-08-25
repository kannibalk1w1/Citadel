import { createHash } from 'crypto'
import { createWriteStream, promises as fsp } from 'fs'
import { get as httpsGet } from 'https'
import type { IncomingMessage } from 'http'
import { basename, join } from 'path'
import {
  EMPTY_MODEL_CHOICE,
  TRANSCRIPTION_MODELS,
  TRANSCRIPTION_SETTINGS_KEYS,
  findTranscriptionModel,
} from '../types/transcription'
import type {
  ModelDownloadProgress,
  ModelInstallState,
  TranscriptionFailure,
  TranscriptionModel,
  TranscriptionModelChoice,
} from '../types/transcription'

/**
 * Installing and choosing the weights, main process only.
 *
 * Nothing here ships inside the installer: even the smallest quantised model
 * would roughly double the portable .exe, and most people never transcribe
 * anything. So the catalogue is a list of things a person may choose to fetch
 * once, from one pinned URL, verified against one pinned digest. A download
 * that does not hash to what was expected is deleted rather than installed,
 * because unverified weights are code someone else chose.
 *
 * Anyone who already keeps whisper.cpp models can point at their own file
 * instead and Citadel downloads nothing at all.
 */

/** Redirects are followed, but not indefinitely: the CDN needs one or two. */
const MAX_REDIRECTS = 5

function readString(settings: Record<string, unknown>, key: string): string | null {
  const value = settings[key]
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

export function modelsDirFor(userDataDir: string): string {
  return join(userDataDir, 'models')
}

export function modelFilePath(modelsDir: string, model: TranscriptionModel): string {
  return join(modelsDir, model.filename)
}

/** What Settings last recorded. A blank value is no choice, not an empty path. */
export function readModelChoice(settings: Record<string, unknown>): TranscriptionModelChoice {
  const managedId = readString(settings, TRANSCRIPTION_SETTINGS_KEYS.managedId)
  return {
    managedId: managedId && findTranscriptionModel(managedId) ? managedId : EMPTY_MODEL_CHOICE.managedId,
    customPath: readString(settings, TRANSCRIPTION_SETTINGS_KEYS.customPath),
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await fsp.stat(path)).isFile()
  } catch {
    return false
  }
}

export type ResolvedModel = { ok: true; path: string; modelId: string }

/**
 * Which weights a transcription will actually use. A path the person chose wins
 * over a managed download, and a choice pointing at a file that has since moved
 * is reported as exactly that rather than falling back silently: a transcript
 * from weights you did not pick is worse than an error.
 */
export async function resolveModelFile(
  modelsDir: string,
  choice: TranscriptionModelChoice,
): Promise<ResolvedModel | TranscriptionFailure> {
  if (choice.customPath) {
    if (await isFile(choice.customPath)) {
      return { ok: true, path: choice.customPath, modelId: basename(choice.customPath) }
    }
    return {
      ok: false,
      code: 'model-missing',
      reason: 'The transcription model you chose is no longer where it was. Pick it again in Settings.',
    }
  }

  if (choice.managedId) {
    const model = findTranscriptionModel(choice.managedId)
    if (model) {
      const path = modelFilePath(modelsDir, model)
      if (await isFile(path)) return { ok: true, path, modelId: model.id }
      return {
        ok: false,
        code: 'model-missing',
        reason: `The ${model.label} transcription model is missing. Download it again in Settings.`,
      }
    }
  }

  return {
    ok: false,
    code: 'no-model',
    reason: 'No transcription model is installed. Settings can download one, or point Citadel at a model file you already have.',
  }
}

/** Everything the Settings pane needs to draw the three rows and the custom row. */
export async function listInstalledModels(
  modelsDir: string,
  settings: Record<string, unknown>,
): Promise<{ states: ModelInstallState[]; choice: TranscriptionModelChoice }> {
  const states = await Promise.all(TRANSCRIPTION_MODELS.map(async (model): Promise<ModelInstallState> => {
    const path = modelFilePath(modelsDir, model)
    try {
      const stat = await fsp.stat(path)
      return { id: model.id, installed: stat.isFile(), bytes: stat.size, downloading: activeDownloads.has(model.id) }
    } catch {
      return { id: model.id, installed: false, downloading: activeDownloads.has(model.id) }
    }
  }))
  return { states, choice: readModelChoice(settings) }
}

export async function removeModel(modelsDir: string, id: string): Promise<{ ok: boolean; reason?: string }> {
  const model = findTranscriptionModel(id)
  if (!model) return { ok: false, reason: 'That model is not one Citadel manages.' }
  try {
    await fsp.rm(modelFilePath(modelsDir, model), { force: true })
    return { ok: true }
  } catch {
    return { ok: false, reason: 'The model file could not be removed. It may be in use.' }
  }
}

/** Downloads in flight, so Settings can say so and a second click cannot start a second one. */
const activeDownloads = new Map<string, AbortController>()

export function abortModelDownload(id: string): void {
  activeDownloads.get(id)?.abort()
}

export function isDownloading(id: string): boolean {
  return activeDownloads.has(id)
}

export type StreamOpener = (url: string) => Promise<{ stream: NodeJS.ReadableStream; totalBytes: number }>

/**
 * One https GET, following the CDN redirect the model host answers with. Split
 * out so a test can hand `downloadModel` a stream without a network.
 */
export const openHttpsStream: StreamOpener = (url) => new Promise((resolve, reject) => {
  const request = (target: string, redirectsLeft: number): void => {
    httpsGet(target, (response: IncomingMessage) => {
      const status = response.statusCode ?? 0
      const location = response.headers.location

      if (status >= 300 && status < 400 && location) {
        response.resume()
        if (redirectsLeft <= 0) {
          reject(new Error('The download was redirected too many times.'))
          return
        }
        request(new URL(location, target).toString(), redirectsLeft - 1)
        return
      }

      if (status !== 200) {
        response.resume()
        reject(new Error(`The download server answered ${status || 'nothing'}.`))
        return
      }

      const length = Number(response.headers['content-length'])
      resolve({ stream: response, totalBytes: Number.isFinite(length) ? length : 0 })
    }).on('error', (error) => reject(error))
  }
  request(url, MAX_REDIRECTS)
})

export type DownloadOptions = {
  onProgress?: (progress: ModelDownloadProgress) => void
  openStream?: StreamOpener
}

export type DownloadResult = { ok: true; bytes: number } | { ok: false; reason: string }

/**
 * Fetch, hash, then install. The bytes land in a `.part` file and are renamed
 * into place only once the digest matches, so a cancelled or corrupted download
 * can never present itself as an installed model.
 */
export async function downloadModel(
  modelsDir: string,
  id: string,
  options: DownloadOptions = {},
): Promise<DownloadResult> {
  const model = findTranscriptionModel(id)
  if (!model) return { ok: false, reason: 'That model is not one Citadel manages.' }
  if (activeDownloads.has(id)) return { ok: false, reason: 'That model is already downloading.' }

  const controller = new AbortController()
  activeDownloads.set(id, controller)

  const target = modelFilePath(modelsDir, model)
  const partial = `${target}.part`

  try {
    await fsp.mkdir(modelsDir, { recursive: true })
    const open = options.openStream ?? openHttpsStream
    const { stream, totalBytes } = await open(model.url)
    const expectedBytes = totalBytes || model.bytes

    const hash = createHash('sha256')
    let received = 0
    let lastReport = 0

    await new Promise<void>((resolve, reject) => {
      const file = createWriteStream(partial)
      const stop = (error: Error): void => {
        stream.removeAllListeners('data')
        file.destroy()
        reject(error)
      }

      controller.signal.addEventListener('abort', () => stop(new Error('cancelled')), { once: true })

      stream.on('data', (chunk: Buffer) => {
        hash.update(chunk)
        received += chunk.length
        // Once a percent, not once a packet: a 190 MB model is tens of
        // thousands of chunks and the renderer only draws one bar.
        const percent = expectedBytes ? Math.floor((received / expectedBytes) * 100) : 0
        if (percent !== lastReport) {
          lastReport = percent
          options.onProgress?.({ id, receivedBytes: received, totalBytes: expectedBytes, percent })
        }
      })
      stream.on('error', stop)
      file.on('error', stop)
      file.on('finish', () => resolve())
      stream.pipe(file)
    })

    const digest = hash.digest('hex')
    if (digest !== model.sha256) {
      await fsp.rm(partial, { force: true })
      return { ok: false, reason: 'The downloaded model did not match its published checksum, so Citadel discarded it.' }
    }

    await fsp.rename(partial, target)
    options.onProgress?.({ id, receivedBytes: received, totalBytes: expectedBytes, percent: 100 })
    return { ok: true, bytes: received }
  } catch (error) {
    await fsp.rm(partial, { force: true }).catch(() => {})
    if (error instanceof Error && error.message === 'cancelled') {
      return { ok: false, reason: 'Download cancelled.' }
    }
    return { ok: false, reason: error instanceof Error ? error.message : 'The model could not be downloaded.' }
  } finally {
    activeDownloads.delete(id)
  }
}
