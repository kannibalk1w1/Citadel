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

test('a capture keeps its source, location, and connection', async () => {
  const page = session!.page
  const connectionPathsBefore = await page.locator('svg path').count()

  await page.evaluate((path) => {
    const target = document.querySelector('canvas')
    if (!target) throw new Error('Canvas did not render')
    const file = new File(['fixture'], 'palette-source.svg', { type: 'image/svg+xml' })
    Object.defineProperty(file, 'path', { value: path })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    target.dispatchEvent(new DragEvent('drop', {
      bubbles: true, cancelable: true, clientX: 700, clientY: 420, dataTransfer: transfer,
    }))
  }, fixturePath)

  await page.evaluate(() => {
    const content = document.querySelector('canvas')?.parentElement
    if (!content) throw new Error('Konva content did not render')
    content.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 700, clientY: 420, button: 2,
    }))
  })
  await page.getByRole('button', { name: 'Capture note from source…' }).click({ force: true })

  await expect(page.getByText('Capture text or description:')).toBeVisible()
  await page.keyboard.type('Warm orange carries the focal value.\nIt returns in the shadow edge.')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText('Source URL or file path (optional):')).toBeVisible()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('https://example.com/reference-study')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Page, section, or time (optional):')).toBeVisible()
  await page.keyboard.type('Figure 2')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Drag across the image to mark the captured area.')).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click({ force: true })

  await expect(page.getByText('Source capture added and linked')).toBeVisible()
  await expect(page.getByText('https://example.com/reference-study')).toBeVisible()
  await expect(page.getByText('Figure 2')).toBeVisible()
  await expect.poll(() => page.locator('svg path').count()).toBeGreaterThan(connectionPathsBefore)
})
