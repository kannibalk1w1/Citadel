import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * Launching Citadel for a desktop test.
 *
 * Every session gets a fresh --user-data-dir, so a test never reads or changes
 * real settings, projects, recent files, or keybind overrides.
 */
const projectRoot = resolve(__dirname, '..')

export type CitadelSession = {
  app: ElectronApplication
  page: Page
  userDataDir: string
  /** True when the caller supplied the profile and is responsible for it. */
  borrowed: boolean
}

/**
 * `reuseUserDataDir` keeps a profile across launches, which is the only way to
 * test the things a manual pass checks by quitting and reopening — that a theme,
 * a rebound key or a dismissed first run actually stuck. Callers that reuse a
 * directory own removing it; closeCitadel only deletes the ones it made.
 */
export async function launchCitadel(reuseUserDataDir?: string): Promise<CitadelSession> {
  const userDataDir = reuseUserDataDir ?? await mkdtemp(join(tmpdir(), 'citadel-e2e-'))
  const app = await electron.launch({
    args: [
      projectRoot,
      `--user-data-dir=${userDataDir}`,
      // A test window is usually behind something, or on a display nobody is
      // looking at, and Chromium answers that by stopping the frame clock. The
      // canvas is drawn from `requestAnimationFrame`, so a throttled window
      // renders nothing and Konva hit-tests every pointer as a miss — the
      // canvas is live, but untouchable. These keep the frame clock running.
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
    ],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
  })
  const page = await app.firstWindow()
  await app.browserWindow(page).then((window) => window.evaluate((w) => {
    w.webContents.setBackgroundThrottling(false)
  }))
  return { app, page, userDataDir, borrowed: reuseUserDataDir !== undefined }
}

export async function closeCitadel(session: CitadelSession | undefined): Promise<void> {
  if (!session) return
  await session.app.close().catch(() => {})
  if (!session.borrowed) await rm(session.userDataDir, { recursive: true, force: true })
}

/**
 * Past first run and onto the board. The continuously-redrawn canvas means
 * Playwright's stability heuristic never settles, so the click is forced; it
 * still targets the real accessible button.
 */
export async function openBoard(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('button', { name: 'Continue to board' }).click({ force: true })
}
