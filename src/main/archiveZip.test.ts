import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import {
  assertSafeZipPath,
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
    expect(resolveSafeAssetOutputPath('C:/tmp/_citadel_assets', 'assets/folder/relic.png')).toBe('C:\\tmp\\_citadel_assets\\folder\\relic.png')
    expect(() => resolveSafeAssetOutputPath('C:/tmp/_citadel_assets', '../escape.png')).toThrow(/unsafe/i)
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
