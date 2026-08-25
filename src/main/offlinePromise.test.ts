import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

/**
 * Citadel is offline-first and says so in its README, in its store listing, and
 * now in the Settings pane: "Audio is transcribed on this machine and never
 * uploaded." Transcription is the first feature that has any reason to reach
 * the network at all, which makes that claim something to guard rather than
 * something to remember.
 *
 * The rule is one sentence: exactly one code path may open a connection, and a
 * person has to press a button to reach it. This guards the source, like the
 * auto-updater test beside it, because what is worth catching is a later change
 * that quietly adds a second path.
 */

const root = process.cwd()
const mainDir = join(root, 'src', 'main')

const sourcesIn = (dir: string): { name: string; text: string }[] => (
  readdirSync(dir)
    .filter((name) => name.endsWith('.ts') && !name.includes('.test.'))
    .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf-8') }))
)

/** Anything that can open a socket from the main process, where no CSP applies. */
const OPENS_A_CONNECTION = /from '(node:)?https?'|require\('(node:)?https?'\)|net\.request\(|new WebSocket|XMLHttpRequest/

describe('only one path reaches the network', () => {
  it('is the model download, and nothing else in the main process', () => {
    const reaching = sourcesIn(mainDir)
      .filter((file) => OPENS_A_CONNECTION.test(file.text))
      .map((file) => file.name)

    expect(reaching).toEqual(['transcriptionModels.ts'])
  })

  it('is behind an explicit request, not a check that runs on its own', () => {
    const models = readFileSync(join(mainDir, 'transcriptionModels.ts'), 'utf-8')

    // Nothing here may run at import time or on a timer: the download starts
    // when downloadModel is called, and downloadModel is only reachable from
    // the Settings button through transcription:downloadModel.
    expect(models).not.toMatch(/setInterval|setTimeout/)
    expect(models.match(/openHttpsStream/g)?.length).toBe(2)   // its definition and its one default
  })

  it('is not the recogniser, which never sees a URL at all', () => {
    const engine = readFileSync(join(mainDir, 'transcription.ts'), 'utf-8')

    expect(OPENS_A_CONNECTION.test(engine)).toBe(false)
    expect(engine).not.toContain('http')
  })

  it('is not reached by transcribing, only by asking for a model', () => {
    const ipc = readFileSync(join(mainDir, 'ipc.ts'), 'utf-8')
    const transcribeHandler = ipc.slice(
      ipc.indexOf("ipcMain.handle('audio:transcribe'"),
      ipc.indexOf("ipcMain.handle('audio:cancelTranscribe'"),
    )

    expect(transcribeHandler.length).toBeGreaterThan(100)
    expect(transcribeHandler).not.toContain('download')
    expect(transcribeHandler).not.toContain('http')
  })
})

describe('the renderer cannot reach past the machine', () => {
  it('is held to a policy with no network scheme in it', () => {
    const index = readFileSync(join(mainDir, 'index.ts'), 'utf-8')
    const packaged = index
      .split('\n')
      .find((line) => line.includes("connect-src") && !line.includes('ws:'))

    // The packaged policy is the only one a user runs under, and it allows the
    // app's own origin, its local: protocol, and inline data. No http, no https,
    // no websocket: a fetch to an address fails rather than succeeds quietly.
    expect(packaged).toBeDefined()
    expect(packaged).toContain("connect-src 'self'")
    expect(packaged).not.toMatch(/https?:/)
  })

  // pathToUrl passes an address straight through, so anything that hands a
  // stored src to fetch has to check first. A check after the fetch is a check
  // after the call out, which is why these assert the order and not merely the
  // presence of a guard.
  it.each([
    ['canvas/audioTranscription.ts', 'isLocalSourcePath(src)'],
    ['utils/pdfPreview.ts', 'isLocalSourcePath(pdfPath)'],
  ])('refuses a remote source in %s before fetching rather than after', (file, guardCall) => {
    const source = readFileSync(join(root, 'src', 'renderer', ...file.split('/')), 'utf-8')
    const guard = source.indexOf(guardCall)
    const fetchCall = source.indexOf('fetch(')

    expect(guard).toBeGreaterThan(-1)
    expect(fetchCall).toBeGreaterThan(guard)
  })

  it('keeps the rule in one place, so the two guards cannot drift apart', () => {
    const helper = readFileSync(join(root, 'src', 'renderer', 'utils', 'pathToUrl.ts'), 'utf-8')
    const others = ['canvas/audioTranscription.ts', 'utils/pdfPreview.ts']
      .map((file) => readFileSync(join(root, 'src', 'renderer', ...file.split('/')), 'utf-8'))

    expect(helper).toContain('export function isLocalSourcePath')
    // Neither guard carries its own copy of the scheme test.
    for (const source of others) expect(source).not.toContain('a-z0-9+.-')
  })
})
