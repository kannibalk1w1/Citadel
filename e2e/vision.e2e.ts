import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const projectRoot = resolve(__dirname, '..')

type CitadelSession = { app: ElectronApplication; page: Page; userDataDir: string }

async function launchCitadel(): Promise<CitadelSession> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'citadel-e2e-'))
  const app = await electron.launch({
    args: [projectRoot, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
  })
  return { app, page: await app.firstWindow(), userDataDir }
}

let session: CitadelSession | undefined

test.beforeEach(async () => {
  session = await launchCitadel()
  await session.page.waitForLoadState('domcontentloaded')
  await session.page.getByRole('button', { name: 'Continue to board' }).click({ force: true })
})

test.afterEach(async () => {
  await session?.app.close().catch(() => {})
  if (session) await rm(session.userDataDir, { recursive: true, force: true })
  session = undefined
})

/** Both layers a board is drawn across, as the checks have to reach both. */
async function layerStyles(page: Page): Promise<{ canvas: string; dom: string; canvasEvents: string }> {
  return page.evaluate(() => {
    const container = document.querySelector('[data-vision-surface="canvas"]') as HTMLElement | null
    const dom = document.getElementById('dom-items-layer')
    return {
      canvas: container?.style.filter ?? 'NO CONTAINER',
      dom: dom?.style.filter ?? 'NO DOM LAYER',
      canvasEvents: container?.style.pointerEvents ?? '',
    }
  })
}

test('a vision check reaches the real canvas layers and announces itself', async () => {
  const page = session!.page

  await page.keyboard.press('Shift+G')
  await expect(page.getByRole('status')).toContainText('Value check')

  const applied = await layerStyles(page)
  expect(applied.canvas).toBe('grayscale(1)')
  expect(applied.dom).toBe('grayscale(1)')

  // The same key puts the board back.
  await page.keyboard.press('Shift+G')
  await expect(page.getByRole('status')).toBeHidden()
  expect((await layerStyles(page)).canvas).toBe('')
})

test('mirroring flips the view and stops the board responding', async () => {
  const page = session!.page

  await page.keyboard.press('Shift+M')
  await expect(page.getByRole('status')).toContainText('Mirrored')

  const mirrored = await page.evaluate(() => {
    const container = document.querySelector('[data-vision-surface="canvas"]') as HTMLElement | null
    return { transform: container?.style.transform, events: container?.style.pointerEvents }
  })
  expect(mirrored.transform).toBe('scaleX(-1)')
  expect(mirrored.events).toBe('none')

  // The indicator sits outside the filtered container, so it stays readable and
  // clickable while everything behind it is flipped and inert.
  await page.getByRole('button', { name: 'Turn off vision checks' }).click({ force: true })
  await expect(page.getByRole('status')).toBeHidden()
})
