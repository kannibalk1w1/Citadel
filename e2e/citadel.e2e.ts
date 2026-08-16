import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { source as axeSource } from 'axe-core'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const projectRoot = resolve(__dirname, '..')

type CitadelSession = {
  app: ElectronApplication
  page: Page
  userDataDir: string
}

async function launchCitadel(): Promise<CitadelSession> {
  // A fresh user-data directory makes first-run behaviour deterministic and,
  // more importantly, prevents a test from reading or changing real settings.
  const userDataDir = await mkdtemp(join(tmpdir(), 'citadel-e2e-'))
  const app = await electron.launch({
    args: [projectRoot, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
  })
  return { app, page: await app.firstWindow(), userDataDir }
}

async function closeCitadel(session: CitadelSession | undefined): Promise<void> {
  if (!session) return
  await session.app.close().catch(() => {})
  await rm(session.userDataDir, { recursive: true, force: true })
}

async function audit(page: Page, selector: string): Promise<{ violations: unknown[] }> {
  // @axe-core/playwright opens a temporary page internally, which Electron's
  // CDP target does not support. Injecting axe into this real Electron window
  // gives us the same engine without creating a browser-only dependency.
  await page.addScriptTag({ content: axeSource })
  return page.evaluate(async (scope) => {
    const axe = (window as unknown as { axe: { run: (context: string) => Promise<{ violations: unknown[] }> } }).axe
    return axe.run(scope)
  }, selector)
}

let session: CitadelSession | undefined

test.beforeEach(async () => {
  session = await launchCitadel()
  await session.page.waitForLoadState('domcontentloaded')
})

test.afterEach(async () => {
  await closeCitadel(session)
  session = undefined
})

test('first run offers a dismissible getting-started guide', async () => {
  const page = session!.page
  const onboarding = page.getByRole('complementary', { name: 'Getting started' })

  await expect(onboarding).toBeVisible()
  await expect(onboarding.getByText('Welcome to Citadel')).toBeVisible()
  // The board's continuously-rendered canvas means Playwright's normal
  // stability heuristic never settles, even though this fixed overlay is
  // visible and enabled. Force still targets the actual accessible button.
  await onboarding.getByRole('button', { name: 'Continue to board' }).click({ force: true })
  await expect(onboarding).toBeHidden()
})

test('the command palette opens with its keyboard shortcut', async () => {
  const page = session!.page
  await page.getByRole('button', { name: 'Continue to board' }).click({ force: true })

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Search commands' })).toBeFocused()
})

test('onboarding and the command palette have no automated accessibility violations @a11y', async () => {
  const page = session!.page
  const onboarding = page.getByRole('complementary', { name: 'Getting started' })
  const onboardingResults = await audit(page, '[aria-label="Getting started"]')
  expect(onboardingResults.violations).toEqual([])

  await onboarding.getByRole('button', { name: 'Continue to board' }).click({ force: true })
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const paletteResults = await audit(page, '[role="dialog"][aria-label="Command palette"]')
  expect(paletteResults.violations).toEqual([])
})
