import { expect, test } from '@playwright/test'
import { closeCitadel, launchCitadel, openBoard, type CitadelSession } from './harness'

let session: CitadelSession | undefined

test.afterEach(async () => { await closeCitadel(session); session = undefined })

const swatch = (id: string, x: number, color: string) => ({
  id, x, y: 100, width: 100, height: 100, rotation: 0, type: 'swatch',
  zIndex: 0, locked: false, visible: true, opacity: 1, tags: [], meta: { colors: [color] },
})
const project = JSON.stringify({
  version: '1.0.0', createdAt: 1, updatedAt: 1, activeBoardId: 'export-board',
  boards: [{
    id: 'export-board', name: 'Export regression', viewport: { x: 0, y: 0, scale: 1 },
    items: [swatch('green', 100, '#00ff00'), swatch('red', 400, '#ff0000')],
    connections: [{
      id: 'relation', fromId: 'green', toId: 'red', fromAnchor: 'right', toAnchor: 'left',
      style: 'straight', arrowHead: 'arrow', color: '#ff00ff', width: 8, dashed: false,
      label: 'relation-check',
    }],
  }],
})

async function setup(area: 'selection' | 'board'): Promise<void> {
  session = await launchCitadel()
  await openBoard(session.page)
  await session.page.evaluate(async (exportArea) => {
    const ipc = (window as unknown as { ipc: { invoke: (channel: string, args: unknown) => Promise<unknown> } }).ipc
    await ipc.invoke('settings:set', { key: 'export.area', value: exportArea })
  }, area)
  await session.app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1.5)
  })
  await session.page.reload()
  await expect(session.page.locator('canvas').first()).toBeVisible()
  // Replace only OS file-picking/writing boundaries. The renderer still runs
  // the real open and export actions, including Konva painting and composition.
  const fixture = JSON.parse(project)
  if (area === 'selection') fixture.boards[0].items[1].x = 170
  await session.app.evaluate(({ ipcMain, BrowserWindow }, data) => {
    ipcMain.removeHandler('file:openDialog')
    ipcMain.handle('file:openDialog', () => ({ path: '/export-fixture.citadel' }))
    ipcMain.removeHandler('file:load')
    ipcMain.handle('file:load', () => ({ data }))
    ipcMain.removeHandler('export:image')
    ipcMain.handle('export:image', (_event, payload) => {
      ;(globalThis as unknown as { exportCapture: string }).exportCapture = payload.imageData
      return { ok: true }
    })
    BrowserWindow.getAllWindows()[0].webContents.send('menu:open')
  }, JSON.stringify(fixture))
  await expect(session.page.getByText('relation-check', { exact: true })).toBeVisible()
}

async function capturePixels() {
  await session!.app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].webContents.send('menu:exportImage')
  })
  await expect.poll(() => session!.app.evaluate(() => Boolean((globalThis as unknown as { exportCapture?: string }).exportCapture))).toBe(true)
  const data = await session!.app.evaluate(() => (globalThis as unknown as { exportCapture: string }).exportCapture)
  return session!.page.evaluate(async (url) => {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let green = 0, red = 0, magenta = 0
    let greenRight = 0, greenBottom = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b, a] = pixels.slice(i, i + 4)
      if (a < 250) continue
      if (g > 245 && r < 10 && b < 10) {
        green++
        greenRight = Math.max(greenRight, (i / 4) % canvas.width)
        greenBottom = Math.max(greenBottom, Math.floor(i / 4 / canvas.width))
      }
      if (r > 245 && g < 10 && b < 10) red++
      if (r > 245 && b > 245 && g < 10) magenta++
    }
    const stage = document.querySelector('canvas')!
    return { green, red, magenta, greenRight, greenBottom, width: canvas.width, height: canvas.height, ratio: stage.width / stage.clientWidth }
  }, data)
}

test('whole-board PNG includes SVG relationships at high DPI', async () => {
  await setup('board')
  const pixels = await capturePixels()
  expect(pixels.ratio).toBeGreaterThan(1)
  expect(pixels.green).toBeGreaterThan(1000)
  expect(pixels.red).toBeGreaterThan(1000)
  expect(pixels.magenta).toBeGreaterThan(100)
})

test('selection PNG omits nearby unselected content and stays inside the bitmap', async () => {
  await setup('selection')
  const canvas = await session!.page.locator('canvas').first().boundingBox()
  await session!.page.mouse.click(canvas!.x + 150, canvas!.y + 120)
  const pixels = await capturePixels()
  expect(pixels.green).toBeGreaterThan(1000)
  expect(pixels.red).toBe(0)
  expect(pixels.magenta).toBe(0)
  expect(pixels.greenRight).toBeLessThan(pixels.width - 20)
  expect(pixels.greenBottom).toBeLessThan(pixels.height - 20)
})

test('PDF export writes a PDF document containing the rendered board image', async () => {
  await setup('board')
  await session!.app.evaluate(({ ipcMain, BrowserWindow }) => {
    ipcMain.removeHandler('export:pdf')
    ipcMain.handle('export:pdf', (_event, payload) => {
      ;(globalThis as unknown as { pdfCapture: string }).pdfCapture = payload.imageData
      return { ok: true }
    })
    BrowserWindow.getAllWindows()[0].webContents.send('menu:exportPdf')
  })
  await expect.poll(() => session!.app.evaluate(() => Boolean((globalThis as unknown as { pdfCapture?: string }).pdfCapture))).toBe(true)
  const data = await session!.app.evaluate(() => (globalThis as unknown as { pdfCapture: string }).pdfCapture)
  const pdf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64').toString('latin1')
  expect(pdf.startsWith('%PDF-')).toBe(true)
  expect(pdf).toContain('/Subtype /Image')
  expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
})
