import { expect, test } from '@playwright/test'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { jsPDF } from 'jspdf'
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

test('previews a local PDF in the Electron renderer', async () => {
  const page = session!.page
  const pdfPath = resolve(__dirname, 'fixtures/pdf-smoke.pdf')
  const rendererLogs: string[] = []
  const pageErrors: string[] = []
  page.on('console', async (message) => {
    const args = await Promise.all(message.args().map(async (arg) => {
      try {
        return await arg.evaluate((value) => value instanceof Error
          ? { name: value.name, message: value.message, details: (value as Error & { details?: unknown }).details, stack: value.stack }
          : value)
      } catch { return arg.toString() }
    }))
    rendererLogs.push(`${message.type()}: ${message.text()} ${JSON.stringify(args)}`)
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const stats = await page.evaluate(() => (window as unknown as {
    ipc: { invoke: (channel: string, payload?: unknown) => Promise<unknown> }
  }).ipc.invoke('cache:previewStats')) as { count: number; bytes: number }

  await page.evaluate((path) => {
    const file = new File(['pdf fixture'], 'pdf-smoke.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'path', { value: path })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    const dropTarget = document.querySelector('[data-vision-surface="canvas"] > div')
    if (!dropTarget) throw new Error('Canvas drop target not found')
    dropTarget.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }))
  }, pdfPath)

  // The item itself is drawn by Konva. A new cache entry proves that PDF.js
  // fetched the local source, parsed page 1, rasterized it, and handed a PNG
  // to the main process for import — not merely that the drop handler returned.
  const cacheDir = join(session!.userDataDir, 'preview-cache')
  try {
    await expect.poll(async () => {
      const files = await readdir(cacheDir).catch(() => [])
      return files.filter((file) => file.startsWith('pdf-smoke-page-') && file.endsWith('.png')).length
    }).toBeGreaterThan(0)
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nRenderer logs:\n${rendererLogs.join('\n')}\nPage errors:\n${pageErrors.join('\n')}`)
  }

  const files = (await readdir(cacheDir)).filter((file) => file.startsWith('pdf-smoke-page-') && file.endsWith('.png'))
  const png = await readFile(join(cacheDir, files[files.length - 1]!))
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  expect(png.readUInt32BE(16)).toBe(400)
  expect(png.readUInt32BE(20)).toBe(200)

  const after = await page.evaluate(() => (window as unknown as {
    ipc: { invoke: (channel: string, payload?: unknown) => Promise<unknown> }
  }).ipc.invoke('cache:previewStats')) as { count: number; bytes: number }
  // Rendering the imported image may also create a regular thumbnail, so the
  // PDF page entry is the minimum increase rather than the entire delta.
  expect(after.count).toBeGreaterThanOrEqual(stats.count + 1)
  expect(after.bytes).toBeGreaterThan(stats.bytes)
})

test('browses and searches a multi-page PDF with undo and no network requests', async () => {
  const page = session!.page
  const pdfPath = join(session!.userDataDir, 'pdf-multipage.pdf')
  const fixture = new jsPDF({ unit: 'pt', format: [400, 200], orientation: 'landscape' })
  fixture.setFontSize(10)
  fixture.text('First page: archival introduction.', 20, 40)
  fixture.addPage([200, 400], 'portrait')
  fixture.text('Second page: research needle.', 10, 40)
  fixture.addPage([400, 200], 'landscape')
  fixture.text('Third page: closing reference.', 20, 40)
  await writeFile(pdfPath, Buffer.from(fixture.output('arraybuffer')))
  const remoteRequests: string[] = []
  page.on('request', (request) => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()) })
  await page.evaluate((path) => {
    const file = new File(['pdf fixture'], 'pdf-multipage.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'path', { value: path })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    const dropTarget = document.querySelector('[data-vision-surface="canvas"] > div')
    if (!dropTarget) throw new Error('Canvas drop target not found')
    dropTarget.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: 500, clientY: 350, dataTransfer }))
  }, pdfPath)

  const panel = page.getByRole('region', { name: 'PDF document' })
  await expect(panel.getByLabel('Page', { exact: true })).toHaveValue('1')
  await expect(panel.getByRole('button', { name: 'Next PDF page' })).toBeEnabled()
  await expect(panel.getByText('of 3', { exact: true })).toBeVisible()
  const cacheDir = join(session!.userDataDir, 'preview-cache')
  const pageImages = async () => (await readdir(cacheDir)).filter((file) => file.startsWith('pdf-multipage-page-'))
  expect((await pageImages()).every((file) => file.includes('-page-1-'))).toBe(true)

  await panel.getByRole('button', { name: 'Next PDF page' }).click()
  await expect(panel.getByLabel('Page', { exact: true })).toHaveValue('2')
  const page2 = (await pageImages()).find((file) => file.includes('-page-2-'))!
  const png = await readFile(join(cacheDir, page2))
  expect(png.readUInt32BE(16)).toBeLessThan(png.readUInt32BE(20))

  await panel.getByRole('button', { name: 'Previous PDF page' }).click()
  await expect(panel.getByLabel('Page', { exact: true })).toHaveValue('1')
  await panel.getByLabel('Page', { exact: true }).fill('3')
  await panel.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(panel.getByLabel('Page', { exact: true })).toHaveValue('3')
  await expect(panel.getByRole('button', { name: 'Next PDF page' })).toBeDisabled()
  await expect(panel.getByRole('button', { name: 'Previous PDF page' })).toBeEnabled()

  const rastersBeforeSearch = (await pageImages()).length
  await panel.getByLabel('Search PDF text').fill('research needle')
  await panel.getByRole('button', { name: 'Search PDF', exact: true }).click()
  const result = panel.getByRole('button', { name: /Page 2.*research needle/ })
  await expect(result).toBeVisible()
  expect((await pageImages()).length).toBe(rastersBeforeSearch)
  await result.click()
  await expect(panel.getByLabel('Page', { exact: true })).toHaveValue('2')

  // Move focus off text fields before invoking the application's real undo.
  await panel.getByRole('button', { name: 'Next PDF page' }).focus()
  await page.keyboard.press('Control+z')
  await expect(panel.getByLabel('Page', { exact: true })).toHaveValue('3')
  await page.keyboard.press('Control+Shift+z')
  await expect(panel.getByLabel('Page', { exact: true })).toHaveValue('2')
  expect(remoteRequests).toEqual([])
})
