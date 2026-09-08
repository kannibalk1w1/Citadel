import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { projectSessionRevision } from './projectSession'
import { checkPdfAbort, pdfAbortError, renderPdfPage } from './pdfPreview'

export function pdfSource(item: CanvasItem): string | undefined {
  return item.type === 'image' && typeof item.meta?.sourcePdf === 'string' ? item.meta.sourcePdf : undefined
}

export function pdfPage(item: CanvasItem): number {
  const page = item.meta?.sourcePdfPage
  return typeof page === 'number' && Number.isInteger(page) && page > 0 ? page : 1
}

/** The source revision excludes geometry and annotations, which may be edited
 * while a page renders. A relink, refresh, undo or project replacement fences it. */
export function pdfSourceRevision(item: CanvasItem): string {
  return JSON.stringify([pdfSource(item), item.src, pdfPage(item), item.meta?.sourceFingerprint])
}

export function guardPdfItem(item: CanvasItem, boardId: string, signal?: AbortSignal) {
  const session = projectSessionRevision()
  const revision = pdfSourceRevision(item)
  const controller = new AbortController()
  const abort = () => controller.abort(pdfAbortError())
  const current = (): CanvasItem | undefined => {
    if (session !== projectSessionRevision()) return undefined
    const found = useCanvasStore.getState().boards.find((board) => board.id === boardId)?.items.find((candidate) => candidate.id === item.id)
    return found && pdfSourceRevision(found) === revision ? found : undefined
  }
  const check = () => { if (!current()) abort() }
  const unsubscribe = useCanvasStore.subscribe(check)
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  check()
  return {
    signal: controller.signal,
    current: () => controller.signal.aborted ? undefined : current(),
    dispose: () => { unsubscribe(); signal?.removeEventListener('abort', abort) },
  }
}

export function pdfFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/password|encrypted/i.test(message)) return 'This PDF is password protected. Use an unprotected copy to browse or search it.'
  if (/local PDF files only/.test(message)) return 'Choose a local PDF file to browse or search.'
  if (/limit/.test(message)) return message
  if (/Invalid PDF|corrupt|structure/i.test(message)) return 'This PDF could not be read. It may be damaged.'
  return 'This PDF could not be opened. Check that its source file is still available.'
}

/** Preserves the longest displayed side and top-left position across page sizes;
 * the selected page keeps its aspect ratio without resetting a user's scale. */
export async function changePdfPage(item: CanvasItem, boardId: string, page: number, signal?: AbortSignal): Promise<boolean> {
  const source = pdfSource(item)
  if (!source || item.locked || page === pdfPage(item)) return false
  const guard = guardPdfItem(item, boardId, signal)
  try {
    checkPdfAbort(guard.signal)
    const preview = await renderPdfPage(source, page, guard.signal)
    checkPdfAbort(guard.signal)
    if (!guard.current()) return false
    const ipc = (window as unknown as { ipc: { invoke: (channel: string, args: unknown) => Promise<unknown> } }).ipc
    const cached = await ipc.invoke('pdf:cachePageImage', { pdfPath: source, page, imageData: preview.imageData }) as { path?: unknown }
    checkPdfAbort(guard.signal)
    const current = guard.current()
    if (!current || current.locked) return false
    if (typeof cached.path !== 'string' || !cached.path) throw new Error('PDF cache did not return a path')
    const longest = Math.max(current.width, current.height)
    const scale = longest / Math.max(preview.width, preview.height)
    const patch = {
      src: cached.path,
      width: preview.width * scale,
      height: preview.height * scale,
      meta: { ...current.meta, sourcePdfPage: page, sourcePdfPages: preview.numPages },
    }
    // Stop the revision watcher before committing our own new page.
    guard.dispose()
    useCanvasStore.getState().updateItem(boardId, current.id, patch)
    useHistoryStore.getState().push('ITEM_STYLE', boardId,
      { id: current.id, src: current.src, width: current.width, height: current.height, meta: current.meta },
      { id: current.id, ...patch })
    return true
  } finally { guard.dispose() }
}
