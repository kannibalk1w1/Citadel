import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import type { ExportArea } from '../store/uiStore'
import type { CanvasItem, Viewport } from '../../types'
import { hasDOMLayerItems, paintDOMLayerForExport } from './domLayerExport'

type ExportCanvas = {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

const BOARD_PADDING = 48
const MIN_SCALE = 0.05
const MAX_SCALE = 20

function isCommentItem(item: CanvasItem): boolean {
  return item.type === 'sticky' && item.meta?.kind === 'comment'
}

export function itemsForFittedExport(
  items: CanvasItem[],
  area: Extract<ExportArea, 'board' | 'selection'>,
  selectedIds: string[],
  includeComments: boolean,
): CanvasItem[] {
  const baseItems = area === 'selection'
    ? items.filter((item) => selectedIds.includes(item.id))
    : items
  return includeComments ? baseItems : baseItems.filter((item) => !isCommentItem(item))
}

function getStageCanvas(): HTMLCanvasElement {
  const canvasEl = document.querySelector('canvas') as HTMLCanvasElement | null
  if (!canvasEl) throw new Error('No canvas to export')
  return canvasEl
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

function scaledCanvas(source: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  if (scale <= 1) return source
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(source.width * scale))
  out.height = Math.max(1, Math.round(source.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, out.width, out.height)
  return out
}

/**
 * Konva backs its canvas at device resolution while the viewport transform is
 * in CSS pixels, so DOM-layer overlays have to be scaled by the same ratio to
 * land where they sit on screen. Derived from the element rather than read from
 * devicePixelRatio, so it stays right if Konva's pixelRatio is ever overridden.
 */
export function stagePixelRatio(canvas: Pick<HTMLCanvasElement, 'width' | 'clientWidth'>): number {
  if (!canvas.clientWidth) return 1
  const ratio = canvas.width / canvas.clientWidth
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1
}

/**
 * DOM-layer items — code cards, video, YouTube, audio, 3D — live in an overlay
 * element the stage capture never sees, so they are repainted onto a copy of
 * the captured bitmap. `scaledCanvas` hands back the live stage canvas at scale
 * 1, and drawing on that would smear the items across the board the user is
 * still looking at — so copy first, always.
 *
 * Boards with none of these keep the exact capture they always had, and skip
 * both the copy and the poster decode.
 */
async function withDOMLayer(captured: HTMLCanvasElement, source: HTMLCanvasElement, exportScale: number): Promise<HTMLCanvasElement> {
  const canvasStore = useCanvasStore.getState()
  const items = canvasStore.items()
  if (!hasDOMLayerItems(items)) return captured

  const out = captured === source ? document.createElement('canvas') : captured
  if (out !== captured) {
    out.width = captured.width
    out.height = captured.height
    const copyCtx = out.getContext('2d')
    if (!copyCtx) return captured
    copyCtx.drawImage(captured, 0, 0)
  }

  const ctx = out.getContext('2d')
  if (!ctx) return captured
  const ratio = stagePixelRatio(source) * Math.max(1, exportScale)
  await paintDOMLayerForExport(ctx, items, canvasStore.viewport(), ratio)
  return out
}

function itemBounds(items: CanvasItem[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const visibleItems = items.filter((item) => item.visible !== false)
  if (visibleItems.length === 0) return null
  return {
    minX: Math.min(...visibleItems.map((item) => item.x)),
    minY: Math.min(...visibleItems.map((item) => item.y)),
    maxX: Math.max(...visibleItems.map((item) => item.x + item.width)),
    maxY: Math.max(...visibleItems.map((item) => item.y + item.height)),
  }
}

function fitViewportToItems(items: CanvasItem[], width: number, height: number): Viewport | null {
  const bounds = itemBounds(items)
  if (!bounds) return null

  const boardWidth = Math.max(1, bounds.maxX - bounds.minX)
  const boardHeight = Math.max(1, bounds.maxY - bounds.minY)
  const usableWidth = Math.max(1, width - BOARD_PADDING * 2)
  const usableHeight = Math.max(1, height - BOARD_PADDING * 2)
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(usableWidth / boardWidth, usableHeight / boardHeight)))

  return {
    scale,
    x: width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
    y: height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale,
  }
}

async function captureViewportCanvas(scale: number): Promise<ExportCanvas> {
  const canvasEl = getStageCanvas()
  const captured = scaledCanvas(canvasEl, scale)
  return {
    canvas: await withDOMLayer(captured, canvasEl, scale),
    width: canvasEl.width,
    height: canvasEl.height,
  }
}

async function captureFittedCanvas(area: Extract<ExportArea, 'board' | 'selection'>, scale: number): Promise<ExportCanvas> {
  const canvasStore = useCanvasStore.getState()
  const boardId = canvasStore.activeBoardId
  const canvasEl = getStageCanvas()
  const includeComments = useUIStore.getState().includeCommentsInExport
  const itemsForBounds = itemsForFittedExport(canvasStore.items(), area, canvasStore.selectedIds, includeComments)
  const fittedViewport = fitViewportToItems(itemsForBounds, canvasEl.width, canvasEl.height)
  if (!boardId || !fittedViewport) return captureViewportCanvas(scale)

  const originalViewport = canvasStore.viewport()
  canvasStore.setViewport(boardId, fittedViewport)

  try {
    await waitForPaint()
    await waitForPaint()
    return captureViewportCanvas(scale)
  } finally {
    useCanvasStore.getState().setViewport(boardId, originalViewport)
  }
}

/**
 * A small picture of the board as it currently sits on screen, for the time
 * machine's filmstrip.
 *
 * Deliberately captures the live viewport rather than fitting the whole board:
 * the fitted path moves the viewport, waits two frames and moves it back, which
 * would flash the canvas on every Ctrl+S. Framing it the way the user had it is
 * also the more useful record — it shows where they were working when they
 * decided the state was worth saving.
 *
 * JPEG rather than PNG because these are held in memory for the session and a
 * board of flat colour still costs hundreds of KB as lossless.
 */
export function captureBoardThumbnail(maxWidth = 320): { dataUrl: string; width: number; height: number } | null {
  const source = document.querySelector('canvas') as HTMLCanvasElement | null
  if (!source?.width || !source.height) return null

  const scale = Math.min(1, maxWidth / source.width)
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(source.width * scale))
  out.height = Math.max(1, Math.round(source.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) return null

  // The stage canvas is transparent where the board shows through; without a
  // ground the JPEG encoder fills those pixels with black.
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-canvas').trim() || '#111214'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, out.width, out.height)

  return { dataUrl: out.toDataURL('image/jpeg', 0.7), width: out.width, height: out.height }
}

export async function prepareExportCanvas(): Promise<ExportCanvas> {
  const ui = useUIStore.getState()
  const { exportScale, exportArea, includeCommentsInExport, commentPinsVisible } = ui
  const changedCommentVisibility = commentPinsVisible !== includeCommentsInExport
  if (changedCommentVisibility) {
    ui.setCommentPinsVisible(includeCommentsInExport)
    await waitForPaint()
    await waitForPaint()
  }

  try {
    if (exportArea === 'board' || exportArea === 'selection') return await captureFittedCanvas(exportArea, exportScale)
    return await captureViewportCanvas(exportScale)
  } finally {
    if (changedCommentVisibility) {
      useUIStore.getState().setCommentPinsVisible(commentPinsVisible)
      await waitForPaint()
    }
  }
}
