import { promises as fsp } from 'fs'
import { dirname, isAbsolute, join, relative, resolve } from 'path'
import type JSZip from 'jszip'

export type ArchiveZipLimits = {
  maxEntries?: number
  maxTotalBytes?: number
  maxEntryBytes?: number
}

export type ArchiveZipManifest = {
  project: JSZip.JSZipObject
  assets: JSZip.JSZipObject[]
  totalBytes: number
}

const DEFAULT_LIMITS: Required<ArchiveZipLimits> = {
  maxEntries: 5000,
  maxTotalBytes: 2 * 1024 * 1024 * 1024,
  maxEntryBytes: 512 * 1024 * 1024,
}

function entrySize(file: JSZip.JSZipObject): number {
  const candidate = file as unknown as { _data?: { uncompressedSize?: unknown } }
  return typeof candidate._data?.uncompressedSize === 'number' ? candidate._data.uncompressedSize : 0
}

function isDriveAbsolute(path: string): boolean {
  return /^[a-z]:\//i.test(path)
}

function inside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

export function assertSafeZipPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (!normalized || normalized.startsWith('/') || isDriveAbsolute(normalized) || normalized.includes('\0')) {
    throw new Error(`Unsafe zip path: ${path}`)
  }
  if (parts.some((part) => part === '..' || part === '.')) {
    throw new Error(`Unsafe zip path: ${path}`)
  }
  return normalized
}

export function resolveSafeAssetOutputPath(assetDir: string, zipPath: string): string {
  const safePath = assertSafeZipPath(zipPath)
  if (!safePath.toLowerCase().startsWith('assets/')) {
    throw new Error(`Unexpected archive asset path: ${zipPath}`)
  }
  const relativeAssetPath = safePath.slice('assets/'.length)
  const outPath = resolve(assetDir, relativeAssetPath)
  if (!inside(assetDir, outPath)) throw new Error(`Unsafe archive asset path: ${zipPath}`)
  return outPath
}

export function inspectCitadelZip(zip: JSZip, limits: ArchiveZipLimits = {}): ArchiveZipManifest {
  const effective = { ...DEFAULT_LIMITS, ...limits }
  const files = Object.values(zip.files).filter((file) => !file.dir)
  if (files.length > effective.maxEntries) {
    throw new Error(`Archive has too many entries: ${files.length}`)
  }

  let totalBytes = 0
  let project: JSZip.JSZipObject | undefined
  const assets: JSZip.JSZipObject[] = []

  for (const file of files) {
    const safePath = assertSafeZipPath(file.name)
    const size = entrySize(file)
    if (size > effective.maxEntryBytes) throw new Error(`Archive entry too large: ${file.name}`)
    totalBytes += size
    if (totalBytes > effective.maxTotalBytes) throw new Error('Archive is too large')

    if (safePath === 'project.citadel') {
      project = file
    } else if (safePath.toLowerCase().startsWith('assets/')) {
      assets.push(file)
    } else {
      throw new Error(`Unexpected archive entry: ${file.name}`)
    }
  }

  if (!project) throw new Error('Archive is missing project.citadel')
  return { project, assets, totalBytes }
}

export type ExtractProgress = { done: number; total: number; bytes: number }

export type ExtractOptions = {
  limits?: ArchiveZipLimits
  onProgress?: (progress: ExtractProgress) => void
  concurrency?: number
}

export async function extractCitadelZip(
  manifest: ArchiveZipManifest,
  assetDir: string,
  options: ExtractOptions = {},
): Promise<void> {
  const effective = { ...DEFAULT_LIMITS, ...options.limits }
  const total = manifest.assets.length
  const queue = [...manifest.assets]
  const written: string[] = []
  let done = 0
  let bytes = 0
  let failed = false

  const worker = async (): Promise<void> => {
    while (!failed) {
      const file = queue.shift()
      if (!file) return
      const outPath = resolveSafeAssetOutputPath(assetDir, file.name)
      // Enforce limits on actual decompressed bytes — headers can lie.
      const buf = await file.async('nodebuffer')
      if (buf.length > effective.maxEntryBytes) throw new Error(`Archive entry too large: ${file.name}`)
      bytes += buf.length
      if (bytes > effective.maxTotalBytes) throw new Error('Archive is too large')
      await fsp.mkdir(dirname(outPath), { recursive: true })
      await fsp.writeFile(outPath, buf)
      written.push(outPath)
      done += 1
      options.onProgress?.({ done, total, bytes })
    }
  }

  const workerCount = Math.max(1, Math.min(options.concurrency ?? 4, total))
  const results = await Promise.allSettled(
    Array.from({ length: workerCount }, () => worker().catch((error) => { failed = true; throw error })),
  )
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failure) {
    // A poisoned archive must not leave partial assets behind.
    await Promise.allSettled(written.map((path) => fsp.unlink(path)))
    throw failure.reason
  }
}

export function createProgressThrottle(
  send: (percent: number) => void,
  minIntervalMs = 50,
): (percent: number) => void {
  let lastSentAt = -Infinity
  return (percent) => {
    const now = Date.now()
    if (percent < 100 && now - lastSentAt < minIntervalMs) return
    lastSentAt = now
    send(percent)
  }
}
