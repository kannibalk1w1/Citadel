// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasItem } from '../../types'
import { useCanvasStore } from '../store/canvasStore'
import { useHistoryStore } from '../store/historyStore'
import { replayEvent, revertEvent } from '../store/canvasEventApply'
import { beginProjectSession } from './projectSession'

vi.mock('./pdfPreview', () => ({
  renderPdfPage: vi.fn(),
  pdfAbortError: () => new DOMException('Cancelled', 'AbortError'),
  checkPdfAbort: (signal: AbortSignal) => { if (signal.aborted) throw signal.reason },
}))
import { renderPdfPage } from './pdfPreview'
import { changePdfPage, pdfPage } from './pdfDocument'

const item: CanvasItem = { id: 'pdf', type: 'image', x: 40, y: 90, width: 600, height: 300, rotation: 20, zIndex: 1, locked: false, visible: true, opacity: 1, tags: [], src: '/cache/page1.png', meta: { sourcePdf: '/archive/report.pdf', sourcePdfPage: 1, note: 'keep this' } }
const preview = { imageData: 'data:image/png;base64,page2', width: 300, height: 600, numPages: 3 }
const invoke = vi.fn()
function current() { return useCanvasStore.getState().items()[0] }
function pending<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done }); return { promise, resolve } }

beforeEach(() => {
  beginProjectSession()
  useCanvasStore.setState({ boards: [{ id: 'board', name: 'Board', items: [{ ...item }], connections: [], viewport: { x: 0, y: 0, scale: 1 } }], activeBoardId: 'board', selectedIds: ['pdf'] })
  useHistoryStore.getState().resetHistory()
  vi.mocked(renderPdfPage).mockReset().mockResolvedValue(preview)
  invoke.mockReset().mockResolvedValue({ path: '/cache/page2.png' })
  Object.defineProperty(window, 'ipc', { value: { invoke }, configurable: true })
})

describe('PDF page changes', () => {
  it('changes a page as one ITEM_STYLE event, preserving scale, annotations and position', async () => {
    expect(await changePdfPage(item, 'board', 2)).toBe(true)
    expect(current()).toMatchObject({ src: '/cache/page2.png', width: 300, height: 600, x: 40, y: 90, rotation: 20, meta: { sourcePdf: '/archive/report.pdf', sourcePdfPage: 2, sourcePdfPages: 3, note: 'keep this' } })
    const events = useHistoryStore.getState().events
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'ITEM_STYLE', boardId: 'board', before: { id: 'pdf', src: item.src, width: 600, height: 300, meta: item.meta }, after: { id: 'pdf', src: '/cache/page2.png', width: 300, height: 600 } })
    expect(invoke).toHaveBeenCalledWith('pdf:cachePageImage', { pdfPath: '/archive/report.pdf', page: 2, imageData: preview.imageData })
    revertEvent(useHistoryStore.getState().undo()!)
    expect(current()).toMatchObject({ src: item.src, width: 600, height: 300, meta: { sourcePdfPage: 1 } })
    replayEvent(useHistoryStore.getState().redo()!)
    expect(current()).toMatchObject({ src: '/cache/page2.png', width: 300, height: 600, meta: { sourcePdfPage: 2 } })
  })

  it('preserves movement and resizing performed while a page renders', async () => {
    const render = pending<typeof preview>()
    vi.mocked(renderPdfPage).mockReturnValue(render.promise)
    const changing = changePdfPage(item, 'board', 2)
    useCanvasStore.getState().updateItem('board', item.id, { x: 900, width: 800, height: 400, meta: { ...item.meta, note: 'new annotation' } })
    render.resolve(preview)
    await changing
    expect(current()).toMatchObject({ x: 900, width: 400, height: 800, meta: { note: 'new annotation' } })
  })

  it.each(['delete', 'relink', 'refresh', 'replace-project', 'relink-back'])('rejects stale render after %s', async (change) => {
    const render = pending<typeof preview>()
    vi.mocked(renderPdfPage).mockReturnValue(render.promise)
    const changing = changePdfPage(item, 'board', 2)
    const assertion = expect(changing).rejects.toMatchObject({ name: 'AbortError' })
    const canvas = useCanvasStore.getState()
    if (change === 'delete') canvas.removeItems('board', [item.id])
    if (change === 'relink' || change === 'relink-back') canvas.updateItem('board', item.id, { meta: { ...item.meta, sourcePdf: '/different.pdf' } })
    if (change === 'relink-back') canvas.updateItem('board', item.id, { ...item })
    if (change === 'refresh') canvas.updateItem('board', item.id, { src: '/cache/fresh.png' })
    if (change === 'replace-project') { beginProjectSession(); useCanvasStore.setState({ boards: [...canvas.boards] }) }
    render.resolve(preview)
    await assertion
    expect(useHistoryStore.getState().events).toHaveLength(0)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('checks the project revision again after the cache IPC resolves', async () => {
    const cache = pending<{ path: string }>()
    invoke.mockReturnValue(cache.promise)
    const changing = changePdfPage(item, 'board', 2)
    await vi.waitFor(() => expect(invoke).toHaveBeenCalled())
    beginProjectSession()
    cache.resolve({ path: '/cache/page2.png' })
    expect(await changing).toBe(false)
    expect(current().src).toBe(item.src)
    expect(useHistoryStore.getState().events).toHaveLength(0)
  })

  it('does not render locked items or the currently selected page', async () => {
    expect(await changePdfPage({ ...item, locked: true }, 'board', 2)).toBe(false)
    expect(await changePdfPage(item, 'board', 1)).toBe(false)
    expect(renderPdfPage).not.toHaveBeenCalled()
    expect(pdfPage({ ...item, meta: { sourcePdf: '/legacy.pdf' } })).toBe(1)
  })

  it('cancels after rendering without storing a page', async () => {
    const render = pending<typeof preview>()
    vi.mocked(renderPdfPage).mockReturnValue(render.promise)
    const controller = new AbortController()
    const changing = changePdfPage(item, 'board', 2, controller.signal)
    const assertion = expect(changing).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort(); render.resolve(preview)
    await assertion
    expect(invoke).not.toHaveBeenCalled()
    expect(current().src).toBe(item.src)
  })
})
