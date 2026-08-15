import { existsSync, mkdtempSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { JSZip as JSZipType } from 'jszip'
import {
  assertSafeZipPath,
  createProgressThrottle,
  extractCitadelZip,
  inspectCitadelZip,
  resolveSafeAssetOutputPath,
} from './archiveZip'

async function makeZip(entries: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(entries)) {
    zip.file(path, content)
  }
  return zip.generateAsync({ type: 'nodebuffer' })
}

describe('archiveZip path safety', () => {
  it('accepts project and asset-relative paths', () => {
    expect(assertSafeZipPath('project.citadel')).toBe('project.citadel')
    expect(assertSafeZipPath('assets/relic.png')).toBe('assets/relic.png')
    expect(assertSafeZipPath('assets/folder/relic.png')).toBe('assets/folder/relic.png')
  })

  it('rejects traversal and absolute paths', () => {
    expect(() => assertSafeZipPath('../project.citadel')).toThrow(/unsafe/i)
    expect(() => assertSafeZipPath('assets/../project.citadel')).toThrow(/unsafe/i)
    expect(() => assertSafeZipPath('/assets/relic.png')).toThrow(/unsafe/i)
    expect(() => assertSafeZipPath('C:/assets/relic.png')).toThrow(/unsafe/i)
    expect(() => assertSafeZipPath('assets\\..\\escape.png')).toThrow(/unsafe/i)
  })

  it('keeps extracted asset paths inside the asset directory', () => {
    // Built with the host separator so the guarantee is asserted on Windows and POSIX alike.
    const assetDir = resolve(tmpdir(), '_citadel_assets')

    expect(resolveSafeAssetOutputPath(assetDir, 'assets/folder/relic.png'))
      .toBe(join(assetDir, 'folder', 'relic.png'))

    for (const escape of [
      '../escape.png',
      'assets/../../escape.png',
      'assets\\..\\..\\escape.png',
      '/etc/passwd',
      'C:/Windows/system32/escape.png',
    ]) {
      expect(() => resolveSafeAssetOutputPath(assetDir, escape)).toThrow(/unsafe|unexpected/i)
    }
  })
})

describe('inspectCitadelZip', () => {
  it('requires a project.citadel entry', async () => {
    const zip = await JSZip.loadAsync(await makeZip({ 'assets/relic.png': 'asset' }))

    expect(() => inspectCitadelZip(zip)).toThrow(/project\.citadel/i)
  })

  it('rejects entries outside project.citadel and assets/', async () => {
    const zip = await JSZip.loadAsync(await makeZip({
      'project.citadel': '{}',
      'notes/readme.txt': 'nope',
    }))

    expect(() => inspectCitadelZip(zip)).toThrow(/unexpected/i)
  })

  it('enforces entry count and total uncompressed size limits', async () => {
    const tooMany = await JSZip.loadAsync(await makeZip({
      'project.citadel': '{}',
      'assets/a.txt': 'a',
      'assets/b.txt': 'b',
    }))
    expect(() => inspectCitadelZip(tooMany, { maxEntries: 2 })).toThrow(/too many/i)

    const tooLarge = await JSZip.loadAsync(await makeZip({
      'project.citadel': '{}',
      'assets/large.bin': '123456',
    }))
    expect(() => inspectCitadelZip(tooLarge, { maxTotalBytes: 5 })).toThrow(/too large/i)
  })

  it('returns the project entry and asset entries for valid archives', async () => {
    const zip = await JSZip.loadAsync(await makeZip({
      'project.citadel': '{"version":"1.0.0"}',
      'assets/relic.png': 'asset',
    }))

    const manifest = inspectCitadelZip(zip)

    expect(manifest.project.name).toBe('project.citadel')
    expect(manifest.assets.map((asset) => asset.name)).toEqual(['assets/relic.png'])
  })
})

function fakeEntry(name: string, content: Buffer, claimedSize?: number): JSZipType.JSZipObject {
  return {
    name,
    dir: false,
    _data: { uncompressedSize: claimedSize ?? content.length },
    async: () => Promise.resolve(content),
  } as unknown as JSZipType.JSZipObject
}

function fakeManifest(assets: JSZipType.JSZipObject[]): Parameters<typeof extractCitadelZip>[0] {
  return { project: fakeEntry('project.citadel', Buffer.from('{}')), assets, totalBytes: 0 }
}

describe('extractCitadelZip', () => {
  const dirs: string[] = []
  const tempDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'citadel-extract-'))
    dirs.push(dir)
    return dir
  }

  it('writes assets and reports monotonic progress ending at done === total', async () => {
    const assetDir = tempDir()
    const calls: { done: number; total: number; bytes: number }[] = []
    await extractCitadelZip(
      fakeManifest([
        fakeEntry('assets/a.png', Buffer.from('aaaa')),
        fakeEntry('assets/b.png', Buffer.from('bb')),
      ]),
      assetDir,
      { onProgress: (p) => calls.push(p), concurrency: 1 },
    )
    expect(existsSync(join(assetDir, 'a.png'))).toBe(true)
    expect(existsSync(join(assetDir, 'b.png'))).toBe(true)
    expect(calls.map((c) => c.done)).toEqual([1, 2])
    expect(calls.at(-1)).toEqual({ done: 2, total: 2, bytes: 6 })
  })

  it('rejects an entry whose real bytes exceed maxEntryBytes even when its header lies', async () => {
    const assetDir = tempDir()
    const liar = fakeEntry('assets/liar.bin', Buffer.alloc(64), 4)  // claims 4 bytes, is 64
    await expect(
      extractCitadelZip(fakeManifest([liar]), assetDir, { limits: { maxEntryBytes: 32 } }),
    ).rejects.toThrow(/too large/i)
  })

  it('rejects when real total bytes exceed maxTotalBytes and cleans up written files', async () => {
    const assetDir = tempDir()
    await expect(
      extractCitadelZip(
        fakeManifest([
          fakeEntry('assets/first.bin', Buffer.alloc(30)),
          fakeEntry('assets/second.bin', Buffer.alloc(30)),
        ]),
        assetDir,
        { limits: { maxTotalBytes: 40 }, concurrency: 1 },
      ),
    ).rejects.toThrow(/too large/i)
    expect(readdirSync(assetDir)).toEqual([])  // first.bin was unlinked
  })
})

describe('createProgressThrottle', () => {
  afterEach(() => vi.useRealTimers())

  it('drops events inside the interval but always lets 100 through', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const sent: number[] = []
    const send = createProgressThrottle((p) => sent.push(p), 50)
    send(1)                       // first always sends
    send(2)                       // dropped (0ms later)
    vi.setSystemTime(60)
    send(3)                       // sent (60ms later)
    send(100)                     // 100 always sends
    expect(sent).toEqual([1, 3, 100])
  })
})
