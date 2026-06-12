import { createHash } from 'crypto'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

export type SourceStat = { exists: boolean; size?: number; mtimeMs?: number }
export type CacheStats = { count: number; bytes: number }

export function normalizeSourcePath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase()
}

// Content-addressed thumbnail name: a changed source file (size or mtime)
// gets a new name, and the stale thumbnail becomes unused.
export function thumbnailFilename(sourcePath: string, size: number, mtimeMs: number): string {
  const hash = createHash('sha1').update(normalizeSourcePath(sourcePath)).digest('hex').slice(0, 16)
  return `thumb-${hash}-${size}-${Math.round(mtimeMs)}.png`
}

export function statSource(path: string): SourceStat {
  try {
    const stat = statSync(path)
    if (!stat.isFile()) return { exists: false }
    return { exists: true, size: stat.size, mtimeMs: stat.mtimeMs }
  } catch {
    return { exists: false }
  }
}

export function getPreviewCacheStats(dirs: string[]): CacheStats {
  const stats: CacheStats = { count: 0, bytes: 0 }
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    for (const filename of readdirSync(dir)) {
      try {
        const stat = statSync(join(dir, filename))
        if (stat.isFile()) {
          stats.count += 1
          stats.bytes += stat.size
        }
      } catch { /* skip unreadable cache entries */ }
    }
  }
  return stats
}

export function clearUnusedPreviews(dirs: string[], preservePaths: Iterable<string>): { deleted: number; bytes: number } {
  const preserved = new Set(Array.from(preservePaths, (path) => path.toLowerCase()))
  const result = { deleted: 0, bytes: 0 }
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    for (const filename of readdirSync(dir)) {
      const path = join(dir, filename)
      try {
        const stat = statSync(path)
        if (!stat.isFile() || preserved.has(path.toLowerCase())) continue
        unlinkSync(path)
        result.deleted += 1
        result.bytes += stat.size
      } catch { /* skip locked or unreadable cache entries */ }
    }
  }
  return result
}

export function writePreviewPng(dir: string, filename: string, imageData: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const outPath = join(dir, filename)
  const base64 = imageData.replace(/^data:image\/png;base64,/, '')
  writeFileSync(outPath, Buffer.from(base64, 'base64'))
  return outPath
}
