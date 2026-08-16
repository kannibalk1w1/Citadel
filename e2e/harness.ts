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
}

export async function launchCitadel(): Promise<CitadelSession> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'citadel-e2e-'))
  const app = await electron.launch({
    args: [projectRoot, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
  })
  return { app, page: await app.firstWindow(), userDataDir }
}

export async function closeCitadel(session: CitadelSession | undefined): Promise<void> {
  if (!session) return
  await session.app.close().catch(() => {})
  await rm(session.userDataDir, { recursive: true, force: true })
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
