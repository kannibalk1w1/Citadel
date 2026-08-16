import { expect, test } from '@playwright/test'
import { closeCitadel, launchCitadel, openBoard, type CitadelSession } from './harness'

let session: CitadelSession | undefined

test.beforeEach(async () => {
  session = await launchCitadel()
  await openBoard(session.page)
})

test.afterEach(async () => {
  await closeCitadel(session)
  session = undefined
})

test('the time machine opens and reports an untouched board honestly', async () => {
  const page = session!.page

  await page.keyboard.press('Shift+T')
  const panel = page.getByRole('dialog', { name: 'Time machine' })
  await expect(panel).toBeVisible()

  // Nothing has happened yet, so there is nothing to scrub and it says so
  // rather than showing an empty slider.
  await expect(panel.getByText(/Nothing has happened on this board yet/)).toBeVisible()

  await panel.getByRole('button', { name: 'Close the time machine' }).click({ force: true })
  await expect(panel).toBeHidden()
})

test('a real edit becomes a scrubbable point in the history', async () => {
  const page = session!.page

  // Make one change: the sticky tool plus a click on empty board.
  await page.keyboard.press('n')
  // The DOM-item layer must let clicks fall through to the Konva stage; a
  // regression there silently stops every board interaction.
  const topmost = await page.evaluate(() => document.elementFromPoint(700, 420)?.id ?? '')
  expect(topmost).not.toBe('dom-items-layer')
  await page.mouse.click(700, 420)
  await page.keyboard.press('Escape')

  await page.keyboard.press('Shift+T')
  const panel = page.getByRole('dialog', { name: 'Time machine' })
  await expect(panel).toBeVisible()

  const slider = panel.getByRole('slider', { name: 'Board history' })
  await expect(slider).toBeVisible()
  await expect(panel.getByText(/Added sticky/)).toBeVisible()

  // Scrub back to the start; the board returns to empty.
  await panel.getByRole('button', { name: 'To the start' }).click({ force: true })
  await expect(panel.getByText(/The board as this session found it/)).toBeVisible()
})
