import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import JSZip from 'jszip'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const handlers = new Map<string, (event: unknown, args: unknown) => Promise<unknown> | unknown>()
const workDir = mkdtempSync(join(tmpdir(), 'citadel-archive-ipc-'))

vi.mock('electron', () => ({
  app: { getPath: () => workDir, getVersion: () => '0.0.0-test' },
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, args: unknown) => Promise<unknown> | unknown) => {
      handlers.set(channel, handler)
    },
  },
  dialog: { showSaveDialog: vi.fn(), showOpenDialog: vi.fn() },
  shell: { openExternal: vi.fn() },
  clipboard: { writeImage: vi.fn() },
  nativeImage: { createFromBuffer: vi.fn() },
  BrowserWindow: { fromWebContents: vi.fn() },
  globalShortcut: { register: vi.fn(), unregister: vi.fn(), isRegistered: vi.fn(() => false) },
  screen: { getCursorScreenPoint: vi.fn() },
  Menu: { buildFromTemplate: vi.fn(() => ({})), setApplicationMenu: vi.fn() },
}))

async function writeArchive(name: string, bytes: string): Promise<string> {
  const zip = new JSZip()
  zip.file('project.citadel', JSON.stringify({ boards: [{ items: [{ id: 'relic', type: 'image', src: 'assets/relic.bin' }] }] }))
  zip.file('assets/relic.bin', bytes)
  const path = join(workDir, name)
  writeFileSync(path, await zip.generateAsync({ type: 'nodebuffer' }))
  return path
}

async function importArchive(zipPath: string): Promise<{ ok: boolean; projectJson?: string; assetDir?: string }> {
  const handler = handlers.get('import:zip')
  if (!handler) throw new Error('import:zip was never registered')
  return await handler({ sender: { send: vi.fn() } }, { zipPath }) as { ok: boolean; projectJson?: string; assetDir?: string }
}

beforeAll(async () => {
  const { registerIpcHandlers } = await import('./ipc')
  registerIpcHandlers()
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('import:zip asset isolation', () => {
  it('bundles PDF originals and shared transcript audio once, then resolves every source on import', async () => {
    const { dialog } = await import('electron')
    const archivePath = join(workDir, 'portable-sources.citadelz')
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: false, filePath: archivePath })
    const preview = join(workDir, 'page.png')
    const pdf = join(workDir, 'original.pdf')
    const audio = join(workDir, 'audio.wav')
    writeFileSync(preview, 'preview bytes')
    writeFileSync(pdf, 'original PDF bytes')
    writeFileSync(audio, 'original audio bytes')
    const projectJson = JSON.stringify({ boards: [{ items: [
      { id: 'pdf', type: 'image', src: preview, meta: { sourcePdf: pdf, sourcePdfPage: 2 } },
      { id: 'audio', type: 'audio', src: audio },
      { id: 'transcript', type: 'text', src: audio, meta: { transcriptOf: audio } },
    ] }] })
    const exported = await handlers.get('export:zip')!({ sender: { send: vi.fn() } }, {
      filename: archivePath, projectJson, assetPaths: [preview, pdf, audio],
    }) as { ok: boolean }
    expect(exported.ok).toBe(true)
    const zip = await JSZip.loadAsync(readFileSync(archivePath))
    expect(Object.values(zip.files).filter((entry) => !entry.dir && entry.name.startsWith('assets/'))).toHaveLength(3)
    const loaded = await importArchive(archivePath)
    expect(loaded.ok).toBe(true)
    const items = JSON.parse(loaded.projectJson!).boards[0].items
    expect(readFileSync(items[0].meta.sourcePdf, 'utf8')).toBe('original PDF bytes')
    expect(items[2].src).toBe(items[1].src)
    expect(items[2].meta.transcriptOf).toBe(items[1].src)
    expect(readFileSync(items[2].meta.transcriptOf, 'utf8')).toBe('original audio bytes')
  })

  it('keeps same-named assets from same-directory imports independent', async () => {
    const first = await importArchive(await writeArchive('first.citadelz', 'first archive'))
    const second = await importArchive(await writeArchive('second.citadelz', 'second archive'))

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(first.assetDir).toBeTruthy()
    expect(second.assetDir).toBeTruthy()
    expect(first.assetDir).not.toBe(second.assetDir)

    const firstSrc = (JSON.parse(first.projectJson!) as { boards: Array<{ items: Array<{ src: string }> }> }).boards[0].items[0].src
    const secondSrc = (JSON.parse(second.projectJson!) as { boards: Array<{ items: Array<{ src: string }> }> }).boards[0].items[0].src
    expect(readFileSync(firstSrc, 'utf8')).toBe('first archive')
    expect(readFileSync(secondSrc, 'utf8')).toBe('second archive')
  })

  it('removes only the failed import directory when project parsing fails after extraction', async () => {
    const first = await importArchive(await writeArchive('retained.citadelz', 'keep this asset'))
    expect(first.ok).toBe(true)
    const directoriesBefore = readdirSync(workDir).filter((name) => name.startsWith('_citadel_assets-')).sort()
    const zip = new JSZip()
    zip.file('project.citadel', '{invalid json')
    zip.file('assets/relic.bin', 'must not replace the existing asset')
    const brokenPath = join(workDir, 'broken.citadelz')
    writeFileSync(brokenPath, await zip.generateAsync({ type: 'nodebuffer' }))

    expect((await importArchive(brokenPath)).ok).toBe(false)
    expect(readdirSync(workDir).filter((name) => name.startsWith('_citadel_assets-')).sort()).toEqual(directoriesBefore)
    expect(readFileSync(join(first.assetDir!, 'relic.bin'), 'utf8')).toBe('keep this asset')
  })
})
