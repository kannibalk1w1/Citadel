import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { closeCitadel, launchCitadel, openBoard, type CitadelSession } from './harness'

const fixturePath = resolve(__dirname, 'fixtures', 'palette-source.svg')

let session: CitadelSession | undefined

test.beforeEach(async () => {
  session = await launchCitadel()
  await openBoard(session.page)
})

test.afterEach(async () => {
  await closeCitadel(session)
  session = undefined
})

test('an imported reference image can yield a linked palette', async () => {
  const page = session!.page
  const connectionPathsBefore = await page.locator('svg path').count()

  // Electron gives OS-dropped files a non-standard `path`. Recreate that shape
  // so this drives Citadel's real import path rather than manufacturing state.
  await page.evaluate((path) => {
    const target = document.querySelector('canvas')
    if (!target) throw new Error('Canvas did not render')
    const file = new File(['fixture'], 'palette-source.svg', { type: 'image/svg+xml' })
    Object.defineProperty(file, 'path', { value: path })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    target.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      clientX: 700,
      clientY: 420,
      dataTransfer: transfer,
    }))
  }, fixturePath)

  // Konva owns canvas pointer dispatch. Chromium consumes Playwright's
  // synthetic secondary click as a native menu before it reaches that surface,
  // so emit the same contextmenu event on the element Konva listens to.
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const content = canvas?.parentElement
    if (!content) throw new Error('Konva content did not render')
    content.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 700,
      clientY: 420,
      button: 2,
    }))
  })
  const menu = page.locator('.citadel-context-menu')
  await expect(menu.getByRole('button', { name: 'Pull palette' })).toBeVisible()
  await menu.getByRole('button', { name: 'Pull palette' }).click({ force: true })

  await expect(page.getByText(/Palette pulled: 3 colours/)).toBeVisible()
  // The relationship is an SVG connection: its two rendered paths are added to
  // the layer alongside the swatch, while the focused unit test verifies its
  // `source` meaning and exact endpoints.
  await expect.poll(() => page.locator('svg path').count()).toBeGreaterThan(connectionPathsBefore)
})
