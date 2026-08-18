/**
 * Captures the store-listing screenshots from a real Citadel window.
 *
 * Run: node scripts/captureScreenshots.mjs   (after `npm run build`)
 *
 * Scripted rather than taken by hand so every release ships current pictures
 * from the same board in the same states. It drives the built app through the
 * same Playwright path the desktop tests use, with a throwaway profile, and
 * loads examples/showcase.citadel — the guided example is already the densest,
 * most representative board there is, so the listing shows the thing a new user
 * will actually open.
 *
 * The overlay-mode shot is not here: it needs Citadel sitting over a real
 * drawing program on a real desktop, which is a photograph of two applications
 * rather than something a headless run can stage.
 */
import { _electron as electron } from '@playwright/test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'docs', 'screenshots')
const SIZE = { width: 1600, height: 1000 }

const userDataDir = await mkdtemp(join(tmpdir(), 'citadel-shots-'))
const app = await electron.launch({
  args: [
    root,
    `--user-data-dir=${userDataDir}`,
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
  ],
  env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
})

const page = await app.firstWindow()
await page.waitForLoadState('domcontentloaded')
await (await app.browserWindow(page)).evaluate((w, size) => {
  w.webContents.setBackgroundThrottling(false)
  w.setSize(size.width, size.height)
  // capturePage never resolves for a window the compositor is not drawing, so
  // the window has to be up and focused before any of this is worth trying.
  w.show()
  w.focus()
}, SIZE)

const settle = (ms = 900) => page.waitForTimeout(ms)

/**
 * Captured through Electron rather than page.screenshot(). The board is drawn
 * from requestAnimationFrame and never stops, so Playwright's stability
 * heuristic waits forever; capturePage asks the window for its current frame
 * and returns.
 */
const window_ = await app.browserWindow(page)
const shoot = async (name) => {
  await settle()
  const base64 = await window_.evaluate(async (w) => (await w.webContents.capturePage()).toPNG().toString('base64'))
  await writeFile(join(outDir, `${name}.png`), Buffer.from(base64, 'base64'))
  console.log(`  ${name}.png`)
}

console.log('capturing:')

// Straight into the guided example. "Open the tour" both loads the showcase and
// dismisses the first-run card — pressing "Continue to board" first would close
// the card and take the tour button away with it.
await page.getByRole('button', { name: 'Open the tour' }).click({ force: true })
await settle(2200)

// Store pictures should show the app, not its instrumentation: the board load
// readout is a performance panel, and the project rail is worth opening.
await page.keyboard.press('Shift+L')
await page.getByRole('button', { name: 'Open project rail' }).click({ force: true }).catch(() => {})
await settle(1200)

const board = async (name) => {
  await page.getByText(name, { exact: true }).first().click({ force: true })
  await settle(900)
  // Fit the board to the window. Without this the content sits in the top-left
  // and most of the picture is empty grid.
  await page.keyboard.press('f')
  await settle(900)
}

await board('Research');        await shoot('01-board-research')
await board('Media');           await shoot('02-board-media')
await board('Notes and code');  await shoot('03-board-code')

// A vision check mid-cycle, on the board with the most images.
await board('Research')
await page.keyboard.press('y')
await shoot('04-vision-value')
await page.keyboard.press('Shift+Y')

// The time machine, open over a board with history behind it. Opening a project
// resets the log, so without doing some actual work first the scrubber has
// nothing in it and the picture is an empty-state message.
await page.keyboard.press('n')
for (const [x, y] of [[240, 760], [400, 800], [560, 760]]) {
  await page.mouse.click(x, y)
  await settle(350)
}
await page.keyboard.press('v')
// Deselect, or the item properties panel sits over half the picture.
await page.keyboard.press('Escape')
await page.mouse.click(1000, 880)
await page.keyboard.press('f')
await settle(800)
await page.keyboard.press('Shift+T')
await shoot('05-time-machine')
await page.keyboard.press('Shift+T')

await board('Start here');      await shoot('06-board-start')

await app.close()
await rm(userDataDir, { recursive: true, force: true })
console.log(`\nwrote to docs/screenshots/ at ${SIZE.width}x${SIZE.height}`)
