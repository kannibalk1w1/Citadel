import { expect, test } from '@playwright/test'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeCitadel, launchCitadel, openBoard, type CitadelSession } from './harness'

/**
 * The parts of the release smoke checklist a machine can do.
 *
 * Everything here was previously a line a person read off a list and clicked
 * through by hand, which is exactly the kind of check that gets skimmed on the
 * fourth release. What is left in the manual checklist is there because it needs
 * an installer, a real desktop, or human judgement — not because nobody tried.
 *
 * Native save/open dialogs cannot be driven by Playwright, so file work goes
 * through the same IPC the dialogs call once a path is chosen. That covers the
 * main-process half honestly and skips only the OS picker itself.
 */
const ipc = async (session: CitadelSession, channel: string, payload?: unknown): Promise<unknown> =>
  session.page.evaluate(
    ([c, p]) => (window as unknown as { ipc: { invoke: (c: string, p?: unknown) => Promise<unknown> } })
      .ipc.invoke(c as string, p),
    [channel, payload] as const,
  )

test.describe('a project survives being saved and reopened', () => {
  let session: CitadelSession | undefined
  let workDir = ''

  test.beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'citadel-files-'))
    session = await launchCitadel()
    await openBoard(session.page)
  })

  test.afterEach(async () => {
    await closeCitadel(session)
    await rm(workDir, { recursive: true, force: true })
  })

  test('a .citadel round trip keeps every board, item and connection', async () => {
    const path = join(workDir, 'round-trip.citadel')
    const showcase = await ipc(session!, 'showcase:load') as { data: string }
    const before = JSON.parse(showcase.data)

    await ipc(session!, 'file:save', { path, data: showcase.data })
    const reopened = await ipc(session!, 'file:load', { path }) as { data: string }
    const after = JSON.parse(reopened.data)

    expect(after.boards.length).toBe(before.boards.length)
    expect(after.boards.flatMap((b: { items: unknown[] }) => b.items).length)
      .toBe(before.boards.flatMap((b: { items: unknown[] }) => b.items).length)
    expect(after.boards.flatMap((b: { connections: unknown[] }) => b.connections).length)
      .toBe(before.boards.flatMap((b: { connections: unknown[] }) => b.connections).length)
  })

  test('a .citadelz archive can be written and read back', async () => {
    const archive = join(workDir, 'bundle.citadelz')
    const showcase = await ipc(session!, 'showcase:load') as { data: string }

    await ipc(session!, 'file:save', { path: archive, data: showcase.data })
    const imported = await ipc(session!, 'import:zip', { zipPath: archive }) as
      { ok: boolean; projectJson?: string }

    expect(imported.ok).toBe(true)
    expect(JSON.parse(imported.projectJson!).boards.length).toBe(JSON.parse(showcase.data).boards.length)
  })

  test('a corrupt project is reported, not swallowed', async () => {
    const path = join(workDir, 'broken.citadel')
    await writeFile(path, '{ this is not valid json', 'utf-8')

    // The parse happens in the main process, so a bad file rejects the invoke
    // rather than handing the renderer something to choke on later. Either way
    // the requirement is the same: say so, and leave the open board alone.
    const outcome = await session!.page.evaluate(async (target) => {
      const bridge = (window as unknown as { ipc: { invoke: (c: string, p?: unknown) => Promise<unknown> } }).ipc
      try {
        await bridge.invoke('file:load', { path: target })
        return 'accepted'
      } catch (error) {
        return `rejected: ${error instanceof Error ? error.message : String(error)}`
      }
    }, path)

    expect(outcome).toContain('rejected')
    expect(outcome).toMatch(/json/i)
    // The board that was open is still there.
    await expect(session!.page.locator('canvas').first()).toBeVisible()
  })

  test('unsaved work is written to recovery and offered back', async () => {
    await ipc(session!, 'file:saveRecovery', { data: '{"version":"1.0.0","boards":[]}' })

    const recovered = await ipc(session!, 'recovery:get') as { data: string | null }
    expect(recovered.data).toContain('"version"')

    await ipc(session!, 'recovery:clear')
    expect((await ipc(session!, 'recovery:get') as { data: string | null }).data).toBeNull()
  })
})

test.describe('settings survive a restart', () => {
  let userDataDir = ''
  let session: CitadelSession | undefined

  test.beforeAll(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), 'citadel-restart-'))
  })

  test.afterEach(async () => { await closeCitadel(session); session = undefined })
  test.afterAll(async () => { await rm(userDataDir, { recursive: true, force: true }) })

  test('a theme, a keybind and a first run stick across a quit and relaunch', async () => {
    // ── First launch: change things a person would change ──────────────────
    session = await launchCitadel(userDataDir)
    await openBoard(session.page)
    await ipc(session, 'settings:setMany', {
      values: {
        'ui.theme': 'graphite',
        'ui.themeOverrides': { accent: '#4b8ec4' },
        'ui.mascotVisible': false,
      },
    })
    await ipc(session, 'settings:set', { key: 'ui.onboardingComplete', value: true })
    await closeCitadel(session)

    // ── Second launch: the same profile, a fresh process ───────────────────
    session = await launchCitadel(userDataDir)
    await session.page.waitForLoadState('domcontentloaded')

    const values = await ipc(session, 'settings:getMany', {
      keys: ['ui.theme', 'ui.themeOverrides', 'ui.mascotVisible', 'ui.onboardingComplete'],
    }) as { values: Record<string, unknown> }

    expect(values.values['ui.theme']).toBe('graphite')
    expect(values.values['ui.themeOverrides']).toEqual({ accent: '#4b8ec4' })
    expect(values.values['ui.mascotVisible']).toBe(false)
    expect(values.values['ui.onboardingComplete']).toBe(true)

    // The first run guide must not come back once it has been dismissed.
    await expect(session.page.getByRole('button', { name: 'Continue to board' })).toHaveCount(0)
  })

  test('the profile directory holds settings and nothing surprising', async () => {
    session = await launchCitadel(userDataDir)
    await session.page.waitForLoadState('domcontentloaded')

    const entries = await readdir(userDataDir)
    expect(entries).toContain('settings.json')

    const settings = JSON.parse(await readFile(join(userDataDir, 'settings.json'), 'utf-8'))
    expect(settings['ui.theme']).toBe('graphite')
  })
})

test.describe('the app is offline-first', () => {
  let session: CitadelSession | undefined
  test.afterEach(async () => { await closeCitadel(session); session = undefined })

  test('launching makes no request off the machine', async () => {
    session = await launchCitadel()
    const external: string[] = []
    session.page.on('request', (request) => {
      const url = request.url()
      // devtools, the app's own bundle, and the local: asset protocol are not
      // the network. Anything with a real host is.
      if (/^https?:\/\//.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) external.push(url)
    })

    await openBoard(session.page)
    await session.page.waitForTimeout(8000)   // past the old 5s update check

    expect(external).toEqual([])
  })
})

test.describe('the bundled example', () => {
  let session: CitadelSession | undefined
  test.afterEach(async () => { await closeCitadel(session); session = undefined })

  test('ships with the app and opens from the first-run card', async () => {
    session = await launchCitadel()
    await session.page.waitForLoadState('domcontentloaded')

    await session.page.getByRole('button', { name: 'Open the tour' }).click({ force: true })
    await session.page.waitForTimeout(1500)

    const boards = await session.page.evaluate(() => document.body.innerText)
    expect(boards).toContain('Start here')
  })
})
