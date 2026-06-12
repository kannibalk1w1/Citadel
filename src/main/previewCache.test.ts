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
