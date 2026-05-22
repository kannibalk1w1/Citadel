import { useCanvasStore } from '../store/canvasStore'
import { useUIStore } from '../store/uiStore'
import type { ExportArea } from '../store/uiStore'
import type { CanvasItem, Viewport } from '../../types'

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
  return {
    canvas: scaledCanvas(canvasEl, scale),
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
