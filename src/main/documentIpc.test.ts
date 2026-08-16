import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import JSZip from 'jszip'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * The `document:extractText` channel, exercised through the handler that is
 * actually registered. Everything else in `registerIpcHandlers` is stubbed at
 * the Electron boundary, so this stays a test of one channel's contract: the
 * renderer sends a path and gets back a result object, never an exception.
 */

const handlers = new Map<string, (event: unknown, args: unknown) => unknown>()
const workDir = mkdtempSync(join(tmpdir(), 'citadel-docx-ipc-'))

vi.mock('electron', () => ({
  app: { getPath: () => workDir, getVersion: () => '0.0.0-test' },
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, args: unknown) => unknown) => {
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

async function writeDocx(name: string, text: string): Promise<string> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '</Types>',
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '</Relationships>',
  )
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + `<w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
  )
  const path = join(workDir, name)
  writeFileSync(path, await zip.generateAsync({ type: 'nodebuffer' }))
  return path
}

function callDocumentChannel(args: unknown): Promise<unknown> {
  const handler = handlers.get('document:extractText')
  if (!handler) throw new Error('document:extractText was never registered')
  return Promise.resolve(handler({}, args))
}

beforeAll(async () => {
  const { registerIpcHandlers } = await import('./ipc')
  registerIpcHandlers()
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('document:extractText channel', () => {
  it('is registered so the renderer never opens a document itself', () => {
    expect(handlers.has('document:extractText')).toBe(true)
  })

  it('answers a real .docx path with its text', async () => {
    const path = await writeDocx('channel.docx', 'Read over the bridge')
    const result = await callDocumentChannel({ path })

    expect(result).toMatchObject({
      ok: true,
      format: 'docx',
      sourceName: 'channel.docx',
      text: 'Read over the bridge',
      truncated: false,
    })
  })

  it('answers a bad request with a reason instead of throwing', async () => {
    await expect(callDocumentChannel({ path: join(workDir, 'gone.docx') }))
      .resolves.toMatchObject({ ok: false, code: 'missing' })
    await expect(callDocumentChannel({ path: 'https://example.com/x.docx' }))
      .resolves.toMatchObject({ ok: false, code: 'external-source' })
    await expect(callDocumentChannel({ path: join(workDir, 'legacy.doc') }))
      .resolves.toMatchObject({ ok: false, code: 'legacy-doc' })
    await expect(callDocumentChannel({})).resolves.toMatchObject({ ok: false, code: 'unsupported-format' })
    await expect(callDocumentChannel(undefined)).resolves.toMatchObject({ ok: false, code: 'unsupported-format' })
    await expect(callDocumentChannel({ path: { nested: true } })).resolves.toMatchObject({ ok: false })
  })
})
