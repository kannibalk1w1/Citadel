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

test('a study session refuses a board with nothing to draw from', async () => {
  const page = session!.page

  await page.keyboard.press('Shift+D')

  // Refused with the reason, rather than starting an empty session.
  await expect(page.getByText('This board has no images to study.')).toBeVisible()
  await expect(page.getByRole('status', { name: 'Study session' })).toBeHidden()
})
