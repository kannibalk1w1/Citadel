import { expect, test, type Page } from '@playwright/test'
import { resolve } from 'node:path'
import { closeCitadel, launchCitadel, openBoard, type CitadelSession } from './harness'

const fixturePath = resolve(__dirname, 'fixtures', 'palette-source.svg')
/**
 * A real 400×300 raster, four coloured quadrants around a lighter centre block.
 * The SVG fixture proves the capture flow but does not reliably mount an
 * interactive image node in the packaged harness, so region drawing and region
 * editing — both of which need real pointer hits on the image — use this one.
 * Its size is load-bearing: at 400×300 the drop clamp leaves it alone, so the
 * item on the board is exactly the fixture's own pixels and the arithmetic
 * below stays honest.
 */
const rasterFixturePath = resolve(__dirname, 'fixtures', 'capture-source.png')
const RASTER_WIDTH = 400
const RASTER_HEIGHT = 300
const DROP_X = 700
const DROP_Y = 420

let session: CitadelSession | undefined

test.beforeEach(async () => {
  session = await launchCitadel()
  await openBoard(session.page)
})

test.afterEach(async () => {
  await closeCitadel(session)
  session = undefined
})

/**
 * A drop is an OS event Playwright cannot synthesize, so the File is built in
 * the page with the `path` Electron puts on real dropped files.
 */
async function dropFixture(
  page: Page,
  path: string,
  name: string,
  type: string,
  at: { x: number; y: number } = { x: DROP_X, y: DROP_Y },
): Promise<void> {
  await page.evaluate(([fixture, filename, mime, x, y]) => {
    const target = document.querySelector('canvas')
    if (!target) throw new Error('Canvas did not render')
    const file = new File(['fixture'], filename as string, { type: mime as string })
    Object.defineProperty(file, 'path', { value: fixture })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    target.dispatchEvent(new DragEvent('drop', {
      bubbles: true, cancelable: true, clientX: x as number, clientY: y as number, dataTransfer: transfer,
    }))
  }, [path, name, type, at.x, at.y] as const)
}

async function openItemContextMenu(page: Page): Promise<void> {
  await page.evaluate(() => {
    const content = document.querySelector('canvas')?.parentElement
    if (!content) throw new Error('Konva content did not render')
    content.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 700, clientY: 420, button: 2,
    }))
  })
  await page.getByRole('button', { name: 'Capture note from source…' }).click({ force: true })
}

async function answerCapturePrompts(page: Page, note: string, reference: string, locator: string): Promise<void> {
  await expect(page.getByText('Capture text or description:')).toBeVisible()
  await page.keyboard.type(note)
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText('Source URL or file path (optional):')).toBeVisible()
  await page.keyboard.press('Control+A')
  await page.keyboard.type(reference)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Page, section, or time (optional):')).toBeVisible()
  await page.keyboard.type(locator)
  await page.keyboard.press('Enter')
}

/**
 * Where the dropped image sits on screen.
 *
 * The drop handler centres the item on the drop point in canvas coordinates,
 * and a fresh board's viewport is untransformed, so the only conversion left is
 * the stage container's own offset in the window — which is measured rather
 * than assumed, so a change in chrome height does not silently aim the drags at
 * empty canvas.
 */
async function imageRect(page: Page): Promise<{ left: number; top: number }> {
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) throw new Error('Konva canvas has no box')
  return { left: box.x + DROP_X - RASTER_WIDTH / 2, top: box.y + DROP_Y - RASTER_HEIGHT / 2 }
}

/**
 * Clicks a canvas point until the properties panel names what was clicked.
 *
 * Konva hit-tests against a graph it redraws on its own frame, so a click sent
 * the instant the board changes can be answered by the previous frame — the
 * transformer that has just been dismissed still swallows it. Retrying the
 * click is the honest fix; a fixed wait only moves the race.
 */
async function selectOnCanvas(page: Page, at: { x: number; y: number }, panelSubtitle: RegExp): Promise<void> {
  await expect.poll(async () => {
    await page.mouse.click(at.x, at.y)
    return page.getByText(panelSubtitle).count()
  }).toBeGreaterThan(0)
}

/** The Board Load readout's mounted count — how many items the board holds. */
function boardLoad(page: Page, mounted: number) {
  return page.getByText(`${mounted} / ${mounted}`, { exact: true })
}

/** The reported region, as the four whole percentages the panel prints. */
async function reportedRegion(page: Page): Promise<number[]> {
  const text = await page.getByText(/^Image region:/).textContent()
  return [...(text ?? '').matchAll(/(-?\d+)%/g)].map((match) => Number(match[1]))
}

async function dragOnCanvas(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  // Konva reads movement, not endpoints: a single jump to the target can be
  // delivered as one event and read as no drag at all.
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2)
  await page.mouse.move(to.x, to.y)
  await page.mouse.up()
}

test('a capture keeps its source, location, and connection', async () => {
  const page = session!.page
  const connectionPathsBefore = await page.locator('svg path').count()

  await dropFixture(page, fixturePath, 'palette-source.svg', 'image/svg+xml')
  await openItemContextMenu(page)
  await answerCapturePrompts(page, 'Warm orange carries the focal value.\nIt returns in the shadow edge.', 'https://example.com/reference-study', 'Figure 2')

  await expect(page.getByText('Drag across the image to mark the captured area.')).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click({ force: true })

  await expect(page.getByText('Source capture added and linked')).toBeVisible()
  await expect(page.getByText('https://example.com/reference-study')).toBeVisible()
  await expect(page.getByText('Figure 2')).toBeVisible()
  await page.getByRole('button', { name: 'Open source' }).click({ force: true })
  await expect(page.getByRole('button', { name: 'Open source' })).toBeVisible()
  await expect.poll(() => page.locator('svg path').count()).toBeGreaterThan(connectionPathsBefore)
})

test('a region is drawn on a real image and stays editable afterwards', async () => {
  const page = session!.page

  await dropFixture(page, rasterFixturePath, 'capture-source.png', 'image/png')
  // The drop reads the file's real pixel size before placing it, so wait for
  // the item rather than racing that read.
  await expect.poll(() => page.locator('canvas').count()).toBeGreaterThan(0)
  const { left, top } = await imageRect(page)

  await openItemContextMenu(page)
  await answerCapturePrompts(page, 'The lighter centre block carries the focal value.', 'https://example.com/raster-study', 'Plate 1')

  await expect(page.getByText('Drag across the image to mark the captured area.')).toBeVisible()
  // A quarter in from each edge: the centre block, and a region no rounding
  // can confuse with the whole image.
  await dragOnCanvas(page,
    { x: left + RASTER_WIDTH * 0.25, y: top + RASTER_HEIGHT * 0.25 },
    { x: left + RASTER_WIDTH * 0.75, y: top + RASTER_HEIGHT * 0.75 })

  await expect(page.getByText('Source capture added and linked')).toBeVisible()
  await expect(page.getByText(/^Image region:/)).toBeVisible()
  expect(await reportedRegion(page)).toEqual([25, 25, 50, 50])

  // The capture arrives selected, so its region outline is already editable.
  // Drag the outline itself — not the image — down and to the right.
  await dragOnCanvas(page,
    { x: left + RASTER_WIDTH * 0.5, y: top + RASTER_HEIGHT * 0.5 },
    { x: left + RASTER_WIDTH * 0.6, y: top + RASTER_HEIGHT * 0.6 })

  await expect.poll(() => reportedRegion(page)).toEqual([35, 35, 50, 50])

  // Then pull the bottom-right transformer anchor back in, which resizes.
  await dragOnCanvas(page,
    { x: left + RASTER_WIDTH * 0.85, y: top + RASTER_HEIGHT * 0.85 },
    { x: left + RASTER_WIDTH * 0.65, y: top + RASTER_HEIGHT * 0.65 })

  await expect.poll(async () => (await reportedRegion(page))[2]).toBeLessThan(50)
  const resized = await reportedRegion(page)
  expect(resized.slice(0, 2)).toEqual([35, 35])
  expect(resized[3]).toBeLessThan(50)
})

test('a capture whose source is deleted says so and can be reattached', async () => {
  const page = session!.page

  await dropFixture(page, rasterFixturePath, 'capture-source.png', 'image/png')
  // A second image, clear of the first, so there is somewhere to reattach to.
  await dropFixture(page, rasterFixturePath, 'capture-source.png', 'image/png', { x: 250, y: 200 })
  // Reading a dropped image's real size is asynchronous, so wait for both to
  // be on the board rather than for whichever landed first.
  await expect(boardLoad(page, 2)).toBeVisible()

  // The capture menu acts on the selection, and each drop selects what it just
  // added — so with two images on the board the one being captured from is
  // chosen here rather than left to whichever drop finished last.
  const { left, top } = await imageRect(page)
  await selectOnCanvas(page, { x: left + RASTER_WIDTH / 2, y: top + RASTER_HEIGHT / 2 }, /^image \//)

  await openItemContextMenu(page)
  await answerCapturePrompts(page, 'The lighter centre block carries the focal value.', 'https://example.com/raster-study', 'Plate 1')
  await page.getByRole('button', { name: 'Skip' }).click({ force: true })
  await expect(page.getByRole('button', { name: 'Open source' })).toBeVisible()

  await selectOnCanvas(page, { x: left + RASTER_WIDTH / 2, y: top + RASTER_HEIGHT / 2 }, /^image \//)
  await page.keyboard.press('Delete')
  await expect(boardLoad(page, 2)).toBeVisible()

  // The capture is placed just to the right of the source it came from.
  await selectOnCanvas(page, { x: left + RASTER_WIDTH + 124, y: top + 90 }, /^sticky \//)
  await expect(page.getByText('Source item is missing — it was deleted from the archive.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open source' })).toHaveCount(0)

  await page.getByLabel('Reattach capture to source').selectOption({ index: 1 })

  await expect(page.getByText('Capture reattached to its source')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open source' })).toBeVisible()
  // What the person wrote is what must survive the repair.
  await expect(page.getByText('https://example.com/raster-study')).toBeVisible()
  await expect(page.getByText('Plate 1')).toBeVisible()
})
