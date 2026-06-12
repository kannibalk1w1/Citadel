# Asset Metadata And Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 3 groundwork — cached thumbnails for image relics, renderer asset metadata records, thumbnail-first rendering at far/mid zoom, missing-asset placeholders, and a unified preview cache replacing the PDF-only cache.

**Architecture:** A new main-process `previewCache` module owns all preview filesystem work (content-addressed thumbnail names, stats/clear across the legacy `pdf-cache` and new `preview-cache` dirs). The renderer gains an `assets/` folder: a module-level metadata map with a `useSyncExternalStore` hook, a concurrency-limited thumbnail pipeline, and pure preview policy. `ImageItem` swaps to the thumbnail when its on-screen size fits within thumbnail resolution.

**Tech Stack:** Electron IPC, React 18, react-konva, use-image, Vitest (node env for main, jsdom for components).

Spec: `docs/superpowers/specs/2026-06-12-asset-metadata-thumbnails-design.md`

---

### Task 1: Main-process preview cache module

**Files:**
- Create: `src/main/previewCache.ts`
- Test: `src/main/previewCache.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/main/previewCache.test.ts
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearUnusedPreviews,
  getPreviewCacheStats,
  normalizeSourcePath,
  statSource,
  thumbnailFilename,
  writePreviewPng,
} from './previewCache'

const tempDirs: string[] = []
const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'citadel-preview-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('thumbnailFilename', () => {
  it('is deterministic for the same source identity', () => {
    expect(thumbnailFilename('C:\\archive\\relic.png', 1024, 555)).toBe(
      thumbnailFilename('C:\\archive\\relic.png', 1024, 555),
    )
  })

  it('treats path separators and case as the same source', () => {
    expect(thumbnailFilename('C:\\Archive\\Relic.png', 1024, 555)).toBe(
      thumbnailFilename('c:/archive/relic.png', 1024, 555),
    )
  })

  it('changes when size or mtime changes', () => {
    const base = thumbnailFilename('C:/archive/relic.png', 1024, 555)
    expect(thumbnailFilename('C:/archive/relic.png', 2048, 555)).not.toBe(base)
    expect(thumbnailFilename('C:/archive/relic.png', 1024, 556)).not.toBe(base)
  })

  it('produces a safe png filename', () => {
    expect(thumbnailFilename('C:/archive/weird relic (2).png', 1, 2)).toMatch(
      /^thumb-[0-9a-f]{16}-1-2\.png$/,
    )
  })
})

describe('normalizeSourcePath', () => {
  it('lowercases and forward-slashes paths', () => {
    expect(normalizeSourcePath('C:\\Archive\\Relic.PNG')).toBe('c:/archive/relic.png')
  })
})

describe('statSource', () => {
  it('returns exists false for a missing path', () => {
    expect(statSource(join(makeTempDir(), 'nope.png'))).toEqual({ exists: false })
  })

  it('returns size and mtime for a real file', () => {
    const dir = makeTempDir()
    const path = join(dir, 'relic.png')
    writeFileSync(path, 'data')
    const stat = statSource(path)
    expect(stat.exists).toBe(true)
    expect(stat.size).toBe(4)
    expect(typeof stat.mtimeMs).toBe('number')
  })
})

describe('preview cache stats and clearing', () => {
  it('counts files across multiple cache directories', () => {
    const a = makeTempDir()
    const b = makeTempDir()
    writeFileSync(join(a, 'one.png'), '12345')
    writeFileSync(join(b, 'two.png'), '123')
    expect(getPreviewCacheStats([a, b, join(a, 'missing-dir')])).toEqual({ count: 2, bytes: 8 })
  })

  it('clears only unpreserved files', () => {
    const dir = makeTempDir()
    const keep = join(dir, 'keep.png')
    const drop = join(dir, 'drop.png')
    writeFileSync(keep, 'keep')
    writeFileSync(drop, 'drop')
    const result = clearUnusedPreviews([dir], [keep.toUpperCase()])
    expect(result.deleted).toBe(1)
    expect(getPreviewCacheStats([dir]).count).toBe(1)
  })
})

describe('writePreviewPng', () => {
  it('creates the directory and strips the data url prefix', () => {
    const dir = join(makeTempDir(), 'nested')
    const png = Buffer.from('fakepng').toString('base64')
    const outPath = writePreviewPng(dir, 'thumb-test.png', `data:image/png;base64,${png}`)
    expect(outPath).toBe(join(dir, 'thumb-test.png'))
    expect(getPreviewCacheStats([dir])).toEqual({ count: 1, bytes: 7 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/main/previewCache.test.ts`
Expected: FAIL — cannot resolve `./previewCache`

- [ ] **Step 3: Implement the module**

```ts
// src/main/previewCache.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/main/previewCache.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/previewCache.ts src/main/previewCache.test.ts
git commit -m "feat: add unified preview cache module"
```

---

### Task 2: Wire preview cache IPC channels

**Files:**
- Modify: `src/main/ipc.ts` (remove local pdf cache helpers at lines 17–50; replace handlers `pdf:cachePageImage`, `cache:pdfStats`, `cache:clearUnusedPdfPreviews`)

- [ ] **Step 1: Replace pdf-cache helpers with previewCache imports**

In `src/main/ipc.ts`, extend the fs/path imports stay as-is, add:

```ts
import { clearUnusedPreviews, getPreviewCacheStats, statSource, thumbnailFilename, writePreviewPng } from './previewCache'
```

Below `pdfCacheDir`, add:

```ts
const previewCacheDir = (): string => join(app.getPath('userData'), 'preview-cache')
// New previews are written to preview-cache; legacy pdf-cache is read and cleaned only.
const previewCacheDirs = (): string[] => [previewCacheDir(), pdfCacheDir()]
```

Delete the local `getPdfCacheStats` and `clearUnusedPdfPreviews` functions entirely.

- [ ] **Step 2: Update `pdf:cachePageImage` to write into the unified cache**

Replace the handler body's mkdir/write with `writePreviewPng`:

```ts
ipcMain.handle('pdf:cachePageImage', async (_e, { pdfPath, page, imageData }: { pdfPath: string; page: number; imageData: string }) => {
  const safeBase = pdfPath
    .split(/[/\\]/)
    .pop()
    ?.replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'document'
  const filename = `${safeBase}-page-${page}-${Date.now()}.png`
  return { path: writePreviewPng(previewCacheDir(), filename, imageData) }
})
```

- [ ] **Step 3: Replace the cache stats/clear handlers and add thumbnail channels**

Replace `cache:pdfStats` and `cache:clearUnusedPdfPreviews` with:

```ts
ipcMain.handle('cache:previewStats', async () => getPreviewCacheStats(previewCacheDirs()))

ipcMain.handle('cache:clearUnusedPreviews', async (_e, { preservePaths, assetPaths }: { preservePaths: string[]; assetPaths: string[] }) => {
  const preserved = (Array.isArray(preservePaths) ? preservePaths : []).slice()
  for (const assetPath of Array.isArray(assetPaths) ? assetPaths : []) {
    const stat = statSource(assetPath)
    if (stat.exists && stat.size !== undefined && stat.mtimeMs !== undefined) {
      preserved.push(join(previewCacheDir(), thumbnailFilename(assetPath, stat.size, stat.mtimeMs)))
    }
  }
  const result = clearUnusedPreviews(previewCacheDirs(), preserved)
  return { ...result, stats: getPreviewCacheStats(previewCacheDirs()) }
})

ipcMain.handle('assets:getThumbnail', async (_e, { path }: { path: string }) => {
  const stat = statSource(path)
  if (!stat.exists || stat.size === undefined || stat.mtimeMs === undefined) {
    return { exists: false, thumbnailPath: null }
  }
  const thumbnailPath = join(previewCacheDir(), thumbnailFilename(path, stat.size, stat.mtimeMs))
  return {
    exists: true,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    thumbnailPath: existsSync(thumbnailPath) ? thumbnailPath : null,
  }
})

ipcMain.handle('assets:cacheThumbnail', async (_e, { path, imageData }: { path: string; imageData: string }) => {
  const stat = statSource(path)
  if (!stat.exists || stat.size === undefined || stat.mtimeMs === undefined) {
    throw new Error('Cannot cache thumbnail for missing source file')
  }
  return { thumbnailPath: writePreviewPng(previewCacheDir(), thumbnailFilename(path, stat.size, stat.mtimeMs), imageData) }
})
```

- [ ] **Step 4: Verify typecheck and full test suite**

Run: `npm run typecheck` then `npx vitest run`
Expected: PASS (the settings panel still calls the old channels — it compiles fine since channels are strings; it is updated in Task 7)

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat: serve thumbnails through unified preview cache ipc"
```

---

### Task 3: Renderer preview policy

**Files:**
- Create: `src/renderer/assets/previewPolicy.ts`
- Test: `src/renderer/assets/previewPolicy.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/renderer/assets/previewPolicy.test.ts
import { describe, expect, it } from 'vitest'
import { preferThumbnail, THUMBNAIL_MAX_SIDE, thumbnailDimensions } from './previewPolicy'

describe('preferThumbnail', () => {
  it('uses the thumbnail when the on-screen size fits within thumbnail resolution', () => {
    expect(preferThumbnail(200, 150, false)).toBe(true)
    expect(preferThumbnail(THUMBNAIL_MAX_SIDE, THUMBNAIL_MAX_SIDE, false)).toBe(true)
  })

  it('uses the full image when the relic is larger on screen than the thumbnail', () => {
    expect(preferThumbnail(THUMBNAIL_MAX_SIDE + 1, 100, false)).toBe(false)
    expect(preferThumbnail(100, THUMBNAIL_MAX_SIDE + 1, false)).toBe(false)
  })

  it('always wakes the full image for selected relics', () => {
    expect(preferThumbnail(50, 50, true)).toBe(false)
  })
})

describe('thumbnailDimensions', () => {
  it('downscales the longest side to the max while preserving aspect', () => {
    expect(thumbnailDimensions(1024, 512, 256)).toEqual({ width: 256, height: 128 })
    expect(thumbnailDimensions(512, 1024, 256)).toEqual({ width: 128, height: 256 })
  })

  it('never upscales small images', () => {
    expect(thumbnailDimensions(100, 80, 256)).toEqual({ width: 100, height: 80 })
  })

  it('never returns zero dimensions', () => {
    expect(thumbnailDimensions(10000, 1, 256)).toEqual({ width: 256, height: 1 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/assets/previewPolicy.test.ts`
Expected: FAIL — cannot resolve `./previewPolicy`

- [ ] **Step 3: Implement**

```ts
// src/renderer/assets/previewPolicy.ts
export const THUMBNAIL_MAX_SIDE = 256

// Resolution-aware: use the cached thumbnail when the relic's largest
// on-screen side fits within the thumbnail resolution, so far zoom and small
// mid-zoom relics stay cheap. Selection always wakes the full image.
export function preferThumbnail(screenWidth: number, screenHeight: number, isSelected: boolean): boolean {
  if (isSelected) return false
  return Math.max(screenWidth, screenHeight) <= THUMBNAIL_MAX_SIDE
}

export function thumbnailDimensions(width: number, height: number, maxSide = THUMBNAIL_MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxSide) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }
  }
  const scale = maxSide / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/assets/previewPolicy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/assets/previewPolicy.ts src/renderer/assets/previewPolicy.test.ts
git commit -m "feat: add thumbnail preview policy"
```

---

### Task 4: Asset metadata records

**Files:**
- Create: `src/renderer/assets/assetMetadata.ts`
- Test: `src/renderer/assets/assetMetadata.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/renderer/assets/assetMetadata.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAssetMetadataForTest,
  getAssetMetadata,
  isLocalAssetSrc,
  recordAssetMetadata,
  subscribeAssetMetadata,
} from './assetMetadata'

beforeEach(() => clearAssetMetadataForTest())

describe('isLocalAssetSrc', () => {
  it('accepts filesystem paths and rejects url-like and empty srcs', () => {
    expect(isLocalAssetSrc('C:\\archive\\relic.png')).toBe(true)
    expect(isLocalAssetSrc('https://example.com/x.png')).toBe(false)
    expect(isLocalAssetSrc('data:image/png;base64,abc')).toBe(false)
    expect(isLocalAssetSrc('local:///c/archive/relic.png')).toBe(false)
    expect(isLocalAssetSrc(undefined)).toBe(false)
    expect(isLocalAssetSrc('')).toBe(false)
  })
})

describe('asset metadata records', () => {
  it('stores and merges records, notifying subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeAssetMetadata(listener)

    recordAssetMetadata({ src: 'C:/a.png', exists: true, size: 10 })
    recordAssetMetadata({ src: 'C:/a.png', exists: true, thumbnailPath: 'C:/cache/t.png' })

    const record = getAssetMetadata('C:/a.png')
    expect(record?.size).toBe(10)
    expect(record?.thumbnailPath).toBe('C:/cache/t.png')
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('ignores url-like srcs', () => {
    recordAssetMetadata({ src: 'https://example.com/x.png', exists: true })
    expect(getAssetMetadata('https://example.com/x.png')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/assets/assetMetadata.test.ts`
Expected: FAIL — cannot resolve `./assetMetadata`

- [ ] **Step 3: Implement**

```ts
// src/renderer/assets/assetMetadata.ts
import { useSyncExternalStore } from 'react'

// Derived, renderer-memory metadata about local asset files, keyed by item
// src. First slice of the archive index: later phases add dimensions, hash,
// and worker-backed population.
export type AssetMetadataRecord = {
  src: string
  exists: boolean
  size?: number
  mtimeMs?: number
  thumbnailPath?: string | null // undefined = not yet checked, null = checked and absent
}

const URL_LIKE_RE = /^(https?|data:|blob:|local:|file:)/i

export function isLocalAssetSrc(src: string | undefined): src is string {
  return Boolean(src) && !URL_LIKE_RE.test(src as string)
}

const records = new Map<string, AssetMetadataRecord>()
const listeners = new Set<() => void>()

export function recordAssetMetadata(record: AssetMetadataRecord): void {
  if (!isLocalAssetSrc(record.src)) return
  const previous = records.get(record.src)
  records.set(record.src, { ...previous, ...record })
  listeners.forEach((listener) => listener())
}

export function getAssetMetadata(src: string | undefined): AssetMetadataRecord | undefined {
  return src ? records.get(src) : undefined
}

export function subscribeAssetMetadata(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useAssetMetadata(src: string | undefined): AssetMetadataRecord | undefined {
  return useSyncExternalStore(subscribeAssetMetadata, () => getAssetMetadata(src))
}

export function clearAssetMetadataForTest(): void {
  records.clear()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/assets/assetMetadata.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/assets/assetMetadata.ts src/renderer/assets/assetMetadata.test.ts
git commit -m "feat: add renderer asset metadata records"
```

---

### Task 5: Thumbnail pipeline

**Files:**
- Create: `src/renderer/assets/thumbnailPipeline.ts`
- Test: `src/renderer/assets/thumbnailPipeline.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/renderer/assets/thumbnailPipeline.test.ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAssetMetadataForTest, getAssetMetadata, recordAssetMetadata } from './assetMetadata'
import { ensureThumbnail } from './thumbnailPipeline'

const invoke = vi.fn()

beforeEach(() => {
  clearAssetMetadataForTest()
  invoke.mockReset()
  ;(window as unknown as { ipc: unknown }).ipc = { invoke }
})

describe('ensureThumbnail', () => {
  it('records a cached thumbnail without generating', async () => {
    invoke.mockResolvedValueOnce({ exists: true, size: 10, mtimeMs: 5, thumbnailPath: 'C:/cache/t.png' })
    const generate = vi.fn()

    await ensureThumbnail('C:/a.png', generate)

    expect(generate).not.toHaveBeenCalled()
    expect(getAssetMetadata('C:/a.png')).toMatchObject({ exists: true, thumbnailPath: 'C:/cache/t.png' })
  })

  it('records missing sources without generating', async () => {
    invoke.mockResolvedValueOnce({ exists: false, thumbnailPath: null })

    await ensureThumbnail('C:/gone.png', vi.fn())

    expect(getAssetMetadata('C:/gone.png')).toMatchObject({ exists: false, thumbnailPath: null })
  })

  it('generates and caches when no thumbnail exists', async () => {
    invoke
      .mockResolvedValueOnce({ exists: true, size: 10, mtimeMs: 5, thumbnailPath: null })
      .mockResolvedValueOnce({ thumbnailPath: 'C:/cache/new.png' })
    const generate = vi.fn().mockResolvedValue('data:image/png;base64,abc')

    await ensureThumbnail('C:/a.png', generate)

    expect(generate).toHaveBeenCalledWith('C:/a.png')
    expect(invoke).toHaveBeenCalledWith('assets:cacheThumbnail', { path: 'C:/a.png', imageData: 'data:image/png;base64,abc' })
    expect(getAssetMetadata('C:/a.png')?.thumbnailPath).toBe('C:/cache/new.png')
  })

  it('records a null thumbnail when generation fails so it does not retry forever', async () => {
    invoke.mockResolvedValueOnce({ exists: true, size: 10, mtimeMs: 5, thumbnailPath: null })
    const generate = vi.fn().mockRejectedValue(new Error('boom'))

    await ensureThumbnail('C:/bad.png', generate)

    expect(getAssetMetadata('C:/bad.png')?.thumbnailPath).toBeNull()
    await ensureThumbnail('C:/bad.png', generate)
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('dedupes concurrent requests for the same src', async () => {
    let resolveLookup: (value: unknown) => void = () => {}
    invoke.mockReturnValueOnce(new Promise((resolve) => { resolveLookup = resolve }))

    const first = ensureThumbnail('C:/a.png', vi.fn())
    const second = ensureThumbnail('C:/a.png', vi.fn())
    expect(invoke).toHaveBeenCalledTimes(1)

    resolveLookup({ exists: true, size: 1, mtimeMs: 1, thumbnailPath: 'C:/cache/t.png' })
    await Promise.all([first, second])
  })

  it('skips url-like srcs and already-resolved records', async () => {
    await ensureThumbnail('https://example.com/x.png', vi.fn())
    recordAssetMetadata({ src: 'C:/done.png', exists: true, thumbnailPath: 'C:/cache/done.png' })
    await ensureThumbnail('C:/done.png', vi.fn())
    expect(invoke).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/assets/thumbnailPipeline.test.ts`
Expected: FAIL — cannot resolve `./thumbnailPipeline`

- [ ] **Step 3: Implement**

```ts
// src/renderer/assets/thumbnailPipeline.ts
import { pathToUrl } from '../utils/pathToUrl'
import { getAssetMetadata, isLocalAssetSrc, recordAssetMetadata } from './assetMetadata'
import { thumbnailDimensions } from './previewPolicy'

type IpcApi = { invoke: (channel: string, args?: unknown) => Promise<unknown> }
const getIpc = (): IpcApi => (window as unknown as { ipc: IpcApi }).ipc

type ThumbnailLookup = { exists: boolean; size?: number; mtimeMs?: number; thumbnailPath?: string | null }

export type ThumbnailGenerator = (src: string) => Promise<string>

const inFlight = new Map<string, Promise<void>>()

// Small queue so a far-zoom sweep over a fresh chamber does not decode
// hundreds of full images at once.
const MAX_CONCURRENT_GENERATIONS = 2
let activeGenerations = 0
const generationQueue: (() => void)[] = []

function acquireGenerationSlot(): Promise<void> {
  if (activeGenerations < MAX_CONCURRENT_GENERATIONS) {
    activeGenerations += 1
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    generationQueue.push(() => {
      activeGenerations += 1
      resolve()
    })
  })
}

function releaseGenerationSlot(): void {
  activeGenerations -= 1
  generationQueue.shift()?.()
}

export async function generateImageThumbnail(src: string): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image for thumbnail: ${src}`))
    img.src = pathToUrl(src)
  })
  const { width, height } = thumbnailDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

export function ensureThumbnail(src: string | undefined, generate: ThumbnailGenerator = generateImageThumbnail): Promise<void> {
  if (!isLocalAssetSrc(src)) return Promise.resolve()
  const existing = getAssetMetadata(src)
  if (existing && existing.thumbnailPath !== undefined) return Promise.resolve()
  const pending = inFlight.get(src)
  if (pending) return pending

  const task = (async () => {
    const lookup = await getIpc().invoke('assets:getThumbnail', { path: src }) as ThumbnailLookup
    if (!lookup.exists) {
      recordAssetMetadata({ src, exists: false, thumbnailPath: null })
      return
    }
    if (lookup.thumbnailPath) {
      recordAssetMetadata({ src, exists: true, size: lookup.size, mtimeMs: lookup.mtimeMs, thumbnailPath: lookup.thumbnailPath })
      return
    }
    await acquireGenerationSlot()
    try {
      const imageData = await generate(src)
      const cached = await getIpc().invoke('assets:cacheThumbnail', { path: src, imageData }) as { thumbnailPath?: unknown }
      recordAssetMetadata({
        src,
        exists: true,
        size: lookup.size,
        mtimeMs: lookup.mtimeMs,
        thumbnailPath: typeof cached.thumbnailPath === 'string' ? cached.thumbnailPath : null,
      })
    } catch (error) {
      console.error('Thumbnail generation failed:', error)
      recordAssetMetadata({ src, exists: true, size: lookup.size, mtimeMs: lookup.mtimeMs, thumbnailPath: null })
    } finally {
      releaseGenerationSlot()
    }
  })().finally(() => { inFlight.delete(src) })

  inFlight.set(src, task)
  return task
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/assets/thumbnailPipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/assets/thumbnailPipeline.ts src/renderer/assets/thumbnailPipeline.test.ts
git commit -m "feat: add thumbnail generation pipeline"
```

---

### Task 6: Thumbnail-first ImageItem with missing-asset placeholder

**Files:**
- Create: `src/renderer/canvas/items/useStableImage.ts`
- Modify: `src/renderer/canvas/items/ImageItem.tsx`
- Test: `src/renderer/canvas/items/ImageItem.test.tsx` (extend)

- [ ] **Step 1: Write the failing tests**

Extend `ImageItem.test.tsx`. Update the `use-image` mock to capture the requested URL, mock the pipeline, add `Text` to the react-konva mock, and add a describe block:

```tsx
// replace the use-image mock with:
const imageState = vi.hoisted(() => ({
  image: { width: 320, height: 180, naturalWidth: 320, naturalHeight: 180 } as HTMLImageElement | null,
  lastUrl: '' as string,
}))

vi.mock('use-image', () => ({
  default: (url: string) => {
    imageState.lastUrl = url
    return [imageState.image]
  },
}))

vi.mock('../../assets/thumbnailPipeline', () => ({
  ensureThumbnail: vi.fn().mockResolvedValue(undefined),
}))

// add to the react-konva mock:
  Text: ({ text }: { text?: string }) => <div data-testid="konva-text">{text}</div>,

// new imports at top:
import { clearAssetMetadataForTest, recordAssetMetadata } from '../../assets/assetMetadata'

// in beforeEach, before useCanvasStore.setState:
  clearAssetMetadataForTest()
  imageState.lastUrl = ''

// new describe block:
describe('ImageItem thumbnail-first rendering', () => {
  it('renders the cached thumbnail when the relic is small on screen', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.png', exists: true, thumbnailPath: 'C:/cache/thumb.png' })
    useCanvasStore.setState((state) => ({
      boards: state.boards.map((board) => ({ ...board, viewport: { x: 0, y: 0, scale: 0.5 } })),
    }))

    render(<ImageItem item={imageItem} />)

    expect(imageState.lastUrl).toBe('local:///C:/cache/thumb.png')
  })

  it('renders the full source at close zoom', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.png', exists: true, thumbnailPath: 'C:/cache/thumb.png' })

    render(<ImageItem item={imageItem} />)

    expect(imageState.lastUrl).toBe('local:///C:/archive/memory.png')
  })

  it('renders the full source for selected relics even when small on screen', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.png', exists: true, thumbnailPath: 'C:/cache/thumb.png' })
    useCanvasStore.setState((state) => ({
      selectedIds: [imageItem.id],
      boards: state.boards.map((board) => ({ ...board, viewport: { x: 0, y: 0, scale: 0.5 } })),
    }))

    render(<ImageItem item={imageItem} />)

    expect(imageState.lastUrl).toBe('local:///C:/archive/memory.png')
  })

  it('renders a placeholder with the filename when the source file is missing', () => {
    recordAssetMetadata({ src: 'C:/archive/memory.png', exists: false, thumbnailPath: null })
    imageState.image = null

    render(<ImageItem item={imageItem} />)

    expect(screen.getByTestId('image-group')).toBeTruthy()
    expect(screen.getByTestId('konva-text').textContent).toContain('memory.png')
    expect(screen.queryByTestId('konva-image')).toBeNull()
  })
})
```

Note: `imageItem.src` in the existing test file is `'C:/archive/memory.png'` — record keys must match exactly.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/canvas/items/ImageItem.test.tsx`
Expected: FAIL — thumbnail URL not used, placeholder absent

- [ ] **Step 3: Implement `useStableImage`**

```ts
// src/renderer/canvas/items/useStableImage.ts
import { useEffect, useRef } from 'react'
import useImage from 'use-image'

// Keeps returning the last successfully loaded image while a new URL loads,
// so swapping between thumbnail and full source never blanks the relic.
export function useStableImage(url: string): HTMLImageElement | undefined {
  const [image] = useImage(url)
  const lastLoaded = useRef<HTMLImageElement | undefined>(undefined)
  useEffect(() => {
    if (image) lastLoaded.current = image
  }, [image])
  return image ?? lastLoaded.current
}
```

- [ ] **Step 4: Update `ImageItem.tsx`**

Imports: add `Text` to the react-konva import, drop the direct `use-image` import, and add:

```ts
import { useAssetMetadata } from '../../assets/assetMetadata'
import { preferThumbnail } from '../../assets/previewPolicy'
import { ensureThumbnail } from '../../assets/thumbnailPipeline'
import { useStableImage } from './useStableImage'
```

Replace the `useImage` line at the top of the component with:

```ts
const isSelected = useCanvasStore((s) => s.selectedIds.includes(item.id))
const scale = useCanvasStore((s) => s.viewport().scale)
const meta = useAssetMetadata(item.src)
const useThumb = preferThumbnail(item.width * scale, item.height * scale, isSelected)
const displaySrc = useThumb && meta?.thumbnailPath ? meta.thumbnailPath : item.src ?? ''
const image = useStableImage(pathToUrl(displaySrc))
const isMissing = meta?.exists === false
```

(keep the existing `isSelected` line where it is — just add the new lines around it, before the other hooks so order stays stable). Add a mount effect with the other hooks:

```ts
useEffect(() => { void ensureThumbnail(item.src) }, [item.src])
```

Replace the early return and image-fit block:

```ts
if (!image && !isMissing) return null

const fitMode = ((item.meta?.fitMode as ImageFitMode | undefined) ?? 'stretch')
const imageWidth = image ? (image.naturalWidth || image.width) : item.width
const imageHeight = image ? (image.naturalHeight || image.height) : item.height
const fitRect = fitMode === 'fit' ? imageFitRect(imageWidth, imageHeight, item.width, item.height) : null
const cropRect = fitMode === 'fill' ? imageCoverCrop(imageWidth, imageHeight, item.width, item.height) : undefined
const missingLabel = item.src?.split(/[\\/]/).pop() ?? 'missing relic'
```

In the JSX, replace the `<KonvaImage ... />` element with:

```tsx
{isMissing || !image ? (
  <>
    <Rect
      x={0}
      y={0}
      width={item.width}
      height={item.height}
      fill="#221d18"
      stroke="#2e2820"
      strokeWidth={1}
      dash={[6, 4]}
      listening={false}
    />
    <Text
      x={8}
      y={item.height / 2 - 8}
      width={Math.max(16, item.width - 16)}
      text={missingLabel}
      fontSize={12}
      fontFamily="JetBrains Mono, monospace"
      fill="#8a7a5c"
      ellipsis
      wrap="none"
      listening={false}
    />
  </>
) : (
  <KonvaImage
    image={image}
    x={fitRect?.x ?? 0}
    y={fitRect?.y ?? 0}
    width={fitRect?.width ?? item.width}
    height={fitRect?.height ?? item.height}
    crop={cropRect}
    opacity={item.opacity}
    listening={false}
  />
)}
```

(Konva draws to a raster canvas, so CSS variables cannot resolve here; the hexes are the theme's panel/border/muted-gold tokens.)

- [ ] **Step 5: Run the component tests and full suite**

Run: `npx vitest run src/renderer/canvas/items/ImageItem.test.tsx` then `npx vitest run`
Expected: PASS, including the two pre-existing ImageItem tests

- [ ] **Step 6: Commit**

```bash
git add src/renderer/canvas/items/useStableImage.ts src/renderer/canvas/items/ImageItem.tsx src/renderer/canvas/items/ImageItem.test.tsx
git commit -m "feat: render image relics thumbnail-first with missing placeholders"
```

---

### Task 7: Unified preview cache in the settings panel

**Files:**
- Modify: `src/renderer/ui/panels/KeybindSettings.tsx:25-28,95-127,551-558`

- [ ] **Step 1: Switch the panel to the new channels**

- Rename type `PdfCacheStats` → `PreviewCacheStats` (and its uses at lines 78, 99, 117).
- In `loadCacheStats`: `getIpc().invoke('cache:previewStats')` instead of `'cache:pdfStats'`; error log text → `'Failed to read preview cache stats:'`.
- In `clearUnusedCache`: `getIpc().invoke('cache:clearUnusedPreviews', { preservePaths, assetPaths: localAssetPaths })`; error log text → `'Failed to clear preview cache:'`.
- Panel label `PDF preview cache` → `Preview cache`.

- [ ] **Step 2: Verify**

Run: `npm run typecheck` then `npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/ui/panels/KeybindSettings.tsx
git commit -m "feat: surface unified preview cache in settings"
```

---

### Task 8: Docs, roadmap, and final verification

**Files:**
- Modify: `docs/citadel-performance-roadmap.md` (Implemented performance decisions; Active next-step queue; Phase 3 section)
- Modify: CLAUDE.md IPC channel table (add `assets:getThumbnail`, `assets:cacheThumbnail`, `cache:previewStats`, `cache:clearUnusedPreviews`)

- [ ] **Step 1: Update the roadmap**

Add to "Implemented performance decisions":

- Asset metadata records live in renderer memory (`src/renderer/assets/assetMetadata.ts`), keyed by item src — derived cache, never persisted in the project file.
- Image relics render thumbnail-first: a cached 256px thumbnail when the on-screen size fits within thumbnail resolution, the full source when selected or larger on screen (`previewPolicy.preferThumbnail`).
- Thumbnails are content-addressed (`thumb-<hash>-<size>-<mtime>.png`) in `userData/preview-cache`; the legacy `pdf-cache` is read/cleaned only and new PDF page previews also land in `preview-cache`.
- Missing image sources render a placeholder with the filename instead of disappearing, so relink keeps the relic's place.
- Thumbnail generation is lazy (on relic mount, which virtualization already limits) through a concurrency-2 queue; failures record `thumbnailPath: null` and fall back to the full source without retrying.

Update Phase 3 status to "first slice complete" with remaining items (video posters, 3D captures, GIF thumbs, worker migration, progressive text/label detail) and refresh the Active next-step queue.

- [ ] **Step 2: Run full verification**

Run: `npm run typecheck`, `npx vitest run`, `npm run build`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add docs/citadel-performance-roadmap.md CLAUDE.md
git commit -m "docs: record phase 3 thumbnail-first decisions"
```
